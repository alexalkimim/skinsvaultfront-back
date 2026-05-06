import { NextResponse } from 'next/server';
import axios from 'axios';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// O CACHE ISOLADO DE INSPECT
const V1_INSPECT_CACHE = new Map<string, { float: number | null, pattern: number | null, tradeLockedFloat: boolean }>();

interface InnerAssetProperty {
    propertyid: number;
    float_value?: number | string;
    int_value?: number | string;
}

interface RootAssetPropertyItem {
    assetid: string;
    asset_properties?: InnerAssetProperty[];
}

const extractNativeFloat = (props?: InnerAssetProperty[]): number | null => {
    const wearProp = props?.find(p => p.propertyid === 2);
    return wearProp?.float_value ? Number(wearProp.float_value) : null;
};

const extractNativePattern = (props?: InnerAssetProperty[]): number | null => {
    const patternProp = props?.find(p => p.propertyid === 1);
    return patternProp?.int_value ? Number(patternProp.int_value) : null;
};

export async function POST(request: Request): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Acesso negado." }, { status: 401 });

    try {
        const body = await request.json();
        const steamId64 = String(body.steamId64 || "").trim();
        const assetIds: string[] = body.assetIds || []; 
        
        if (!steamId64 || assetIds.length === 0) return NextResponse.json({ items: [] });

        const itemsToFetch: string[] = [];
        const cachedResults = assetIds.reduce((acc, id) => {
            const cached = V1_INSPECT_CACHE.get(id);
            if (cached) acc.push({ assetid: id, ...cached });
            else itemsToFetch.push(id);
            return acc;
        }, [] as { assetid: string, float: number | null, pattern: number | null, tradeLockedFloat: boolean }[]);

        if (itemsToFetch.length === 0) return NextResponse.json({ items: cachedResults });

        const apiKey = process.env.CSINVENTORY_API_KEY || "";
        const v1Res = await axios.get('https://csinventoryapi.com/api/v1/inventory', {
            params: { api_key: apiKey, steamid64: steamId64, appid: 730, contextid: 2 },
            timeout: 15000
        });

        const v1RootProperties: RootAssetPropertyItem[] = v1Res.data.asset_properties || [];

        const fetchedResults = itemsToFetch.map(assetId => {
            const itemRootProps = v1RootProperties.find(p => p.assetid === assetId);
            const innerProps = itemRootProps?.asset_properties;
            
            const nativeFloat = extractNativeFloat(innerProps);
            const nativePattern = extractNativePattern(innerProps);
            const isTradeLocked = nativeFloat === null;

            const result = { float: nativeFloat, pattern: nativePattern, tradeLockedFloat: isTradeLocked };
            V1_INSPECT_CACHE.set(assetId, result);

            return { assetid: assetId, ...result };
        });

        return NextResponse.json({ items: [...cachedResults, ...fetchedResults] });

    } catch (err: unknown) {
        return NextResponse.json({ items: [] }); // Falha silenciosamente, nunca quebra o Front.
    }
}