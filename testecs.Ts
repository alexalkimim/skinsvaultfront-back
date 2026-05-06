import axios from 'axios';

// --- CONFIGURATION ---
const API_KEY = "b48db86a-78d4-48bf-af6f-d6787f94bd48";
const TRADE_LINK = "https://steamcommunity.com/tradeoffer/new/?partner=1217261641&token=sxUXB_vk";

// --- STRICT INTERFACES (ZERO ANY) ---
interface V1Action {
    link?: string;
}

interface V1Description {
    classid: string;
    instanceid: string;
    market_hash_name?: string;
    name?: string;
    actions?: V1Action[];
}

interface V1Asset {
    assetid: string;
    classid: string;
    instanceid: string;
}

interface InnerAssetProperty {
    propertyid: number;
    string_value?: string;
    float_value?: number | string; // The API returns this as a string sometimes
    int_value?: number | string;   // The API returns this as a string sometimes
    name?: string;
}

interface RootAssetPropertyItem {
    assetid: string;
    asset_properties?: InnerAssetProperty[];
}

interface InspectItemInfo {
    floatvalue?: number;
    paintwear?: number;
    paintseed?: number;
    pattern?: number;
}

// --- PURE FUNCTIONS (ZERO LET) ---

// Extracts Native Float (propertyid: 2)
const extractNativeFloat = (props?: InnerAssetProperty[]): number | null => {
    const wearProp = props?.find(p => p.propertyid === 2);
    return wearProp?.float_value ? Number(wearProp.float_value) : null;
};

// Extracts Native Pattern (propertyid: 1)
const extractNativePattern = (props?: InnerAssetProperty[]): number | null => {
    const patternProp = props?.find(p => p.propertyid === 1);
    return patternProp?.int_value ? Number(patternProp.int_value) : null;
};

// Rebuilds the Inspect Link replacing %propid:6%
const buildCleanInspectLink = (rawLink: string, steamId64: string, assetId: string, props?: InnerAssetProperty[]): string => {
    const baseLink = rawLink
        .replace('%owner_steamid%', steamId64)
        .replace('%assetid%', assetId)
        .replace('%listingid%', '0');

    const certProp = props?.find(p => p.propertyid === 6);
    return certProp?.string_value 
        ? baseLink.replace('%propid:6%', certProp.string_value)
        : baseLink;
};

// --- TARGETED TEST ---
const fetchTargetItem = async (): Promise<void> => {
    console.log(`\n==================================================`);
    console.log(`[1] Resolving Trade Link to SteamID64...`);
    
    try {
        const steamIdRes = await axios.get('https://csinventoryapi.com/api/v2/steam/tradeurl', {
            params: { api_key: API_KEY, url: TRADE_LINK },
            timeout: 10000
        });
        const steamId64 = String(steamIdRes.data.steamid64);

        console.log(`[2] Fetching Full Inventory from V1...`);
        const v1Res = await axios.get('https://csinventoryapi.com/api/v1/inventory', {
            params: { api_key: API_KEY, steamid64: steamId64, appid: 730, contextid: 2 },
            timeout: 15000
        });
        
        // The 3 root arrays from the API
        const v1Assets: V1Asset[] = v1Res.data.assets || [];
        const v1Descriptions: V1Description[] = v1Res.data.descriptions || [];
        const v1RootProperties: RootAssetPropertyItem[] = v1Res.data.asset_properties || [];
        
        console.log(`-> Found ${v1Assets.length} assets, ${v1Descriptions.length} descriptions, and ${v1RootProperties.length} property items.`);

        console.log(`[3] Hunting for Imperial Plaid...`);
        
        const descMap = new Map<string, V1Description>(
            v1Descriptions.map((d: V1Description) => [`${d.classid}_${d.instanceid}`, d])
        );

        // Isolating the glove to keep logs clean
        const targetAssets = v1Assets.filter((asset: V1Asset) => {
            const desc = descMap.get(`${asset.classid}_${asset.instanceid}`);
            const name = (desc?.market_hash_name || desc?.name || "").toLowerCase();
            return name.includes("imperial plaid") || name.includes("xadrez imperial");
        });

        if (targetAssets.length === 0) {
            console.log(`[FAILURE] Imperial Plaid was not found in the inventory.`);
            return;
        }

        for (const assetV1 of targetAssets) {
            const descV1 = descMap.get(`${assetV1.classid}_${assetV1.instanceid}`);
            const itemName = descV1?.market_hash_name || descV1?.name || "Unknown Glove";
            const rawLink = descV1?.actions?.[0]?.link;

            console.log(`\n--- Processing: ${itemName} ---`);
            
            // Finding the properties in the ROOT array based on the assetid
            const itemRootProps = v1RootProperties.find(p => p.assetid === assetV1.assetid);
            const innerProps = itemRootProps?.asset_properties;

            if (rawLink) {
                // 1. Extract Float and Pattern NATIVELY (Super Fast!)
                const nativeFloat = extractNativeFloat(innerProps);
                const nativePattern = extractNativePattern(innerProps);
                
                console.log(`[V1 NATIVE EXTRACTION]`);
                console.log(`Float:   ${nativeFloat ?? 'NOT FOUND'}`);
                console.log(`Pattern: ${nativePattern ?? 'NOT FOUND'}`);

                // 2. Build the perfect inspect link (Just in case we need it)
                const perfectInspectLink = buildCleanInspectLink(rawLink, steamId64, assetV1.assetid, innerProps);
                console.log(`\n[PARSED LINK] ${perfectInspectLink}`);

                if (perfectInspectLink.includes('%propid:6%')) {
                    console.log(`[WARNING] 'propertyid: 6' (Certificate) was NOT found to replace %propid:6%.`);
                } else {
                    console.log(`[SUCCESS] Link successfully parsed with the certificate!`);
                    
                    // 3. Fire at Inspect endpoint to prove it works
                    console.log(`\n[INSPECT] Calling Inspect API to verify the parsed link...`);
                    try {
                        const inspectRes = await axios.get('https://csinventoryapi.com/api/v2/items/inspect', {
                            params: { api_key: API_KEY, url: perfectInspectLink },
                            timeout: 10000
                        });
                        
                        const info: InspectItemInfo = inspectRes.data?.iteminfo || inspectRes.data?.data?.iteminfo || inspectRes.data?.data || inspectRes.data;
                        const inspectedFloat = info?.floatvalue ?? info?.paintwear ?? 'N/A';
                        const inspectedPattern = info?.paintseed ?? info?.pattern ?? 'N/A';

                        console.log(`[INSPECT SUCCESS] Float: ${inspectedFloat} | Pattern: ${inspectedPattern}`);
                    } catch (err: unknown) {
                        if (axios.isAxiosError(err)) {
                            console.error(`[CRASH V2 INSPECT] HTTP Error ${err.response?.status} - ${err.response?.data?.message || err.message}`);
                        } else {
                            console.error(`[CRASH] Unknown error occurred.`);
                        }
                    }
                }
            } else {
                console.log(`[WARNING] Item has no inspect button/link.`);
            }
        }
        console.log(`\n==================================================`);
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error("[CRITICAL ERROR]", error.message);
        }
    }
};

fetchTargetItem();