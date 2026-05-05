import { NextResponse } from 'next/server';
import axios from 'axios';

// --- INTERFACES MINIMALISTAS PARA DEBUG ---
interface ActionItem {
  link?: string;
}

interface FloatObject {
  floatvalue?: number | string;
  paintseed?: number | string;
  pattern?: number | string;
  phase?: string;
  fade_percent?: number | string;
  fade?: number | string;
}

interface InvItemV2 {
  assetid?: string;
  classid?: string;
  instanceid?: string;
  market_hash_name?: string;
  name?: string;
  inspectlink?: string;
  inspect_link?: string;
  actions?: ActionItem[] | Record<string, ActionItem>;
  float?: FloatObject | null;
  float_value?: number | string;
  floatvalue?: number | string;
  paintwear?: number | string;
  paintseed?: number | string;
}

interface V1Asset {
  assetid: string;
  classid: string;
  instanceid: string;
}

interface V1Description {
  classid: string;
  instanceid: string;
  actions?: ActionItem[] | Record<string, ActionItem>;
}

interface V1InventoryResponse {
  assets?: V1Asset[];
  descriptions?: V1Description[];
}

const extractActionsArray = (actionsData?: ActionItem[] | Record<string, ActionItem>): ActionItem[] => {
  if (!actionsData) return [];
  if (Array.isArray(actionsData)) return actionsData;
  return Object.values(actionsData);
};

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const tradeLink = (body.tradeLink || body.url || body.link || "").toString().trim();
    const apiKey = process.env.CSINVENTORY_API_KEY || "";

    if (!tradeLink) return NextResponse.json({ error: "Trade Link obrigatório para o teste." }, { status: 400 });

    console.log(`\n==================================================`);
    console.log(`[TEST_INSPECT] Iniciando isolamento...`);

    // 1. Resolve o Trade Link
    const steamIdRes = await axios.get('https://csinventoryapi.com/api/v2/steam/tradeurl', {
      params: { api_key: apiKey, url: tradeLink },
      timeout: 10000
    });
    const steamId64 = steamIdRes.data.steamid64 as string;
    
    console.log(`SteamID64: ${steamId64}`);

    // 2. Busca os Inventários (V2 e V1)
    const [v2Res, v1Res] = await Promise.all([
      axios.get('https://csinventoryapi.com/api/v2/inventory', { params: { api_key: apiKey, appid: 730, tradelink: tradeLink } }),
      axios.get('https://csinventoryapi.com/api/v1/inventory', { params: { api_key: apiKey, steamid64: steamId64, appid: 730, contextid: 2 } }).catch(() => null)
    ]);

    const rawV2Data = v2Res.data;
    const possibleItems = rawV2Data?.data?.items || rawV2Data?.items || rawV2Data?.data || rawV2Data || [];
    const v2Items: InvItemV2[] = Array.isArray(possibleItems) ? possibleItems : (typeof possibleItems === 'object' ? Object.values(possibleItems) : []);

    // 3. Foca SOMENTE na luva
    const targetItem = v2Items.find(i => (i.market_hash_name || i.name || "").includes("Imperial Plaid"));

    if (!targetItem) {
        console.log(`\n[FAILED] Item "Driver Gloves | Imperial Plaid" NÃO ENCONTRADO no inventário.`);
        console.log(`==================================================\n`);
        return NextResponse.json({ error: "Item alvo não encontrado" }, { status: 404 });
    }

    const assetId = String(targetItem.assetid);
    const itemName = targetItem.market_hash_name || targetItem.name || "Unknown";

    console.log(`\n[TEST_INSPECT]`);
    console.log(`Item encontrado: ${itemName}`);
    console.log(`Asset ID: ${assetId}`);
    
    // 4. Teste de Float Nativo (O que vem direto da chamada V2)
    const nativeFloat = targetItem.float?.floatvalue ?? targetItem.float_value ?? targetItem.floatvalue;
    const nativePattern = targetItem.float?.paintseed ?? targetItem.float?.pattern ?? targetItem.paintseed;

    if (nativeFloat) {
        console.log(`\n[V2_NATIVE_RESULT]`);
        console.log(`Float: ${nativeFloat}`);
        console.log(`Pattern: ${nativePattern ?? 'N/A'}`);
    } else {
        console.log(`\n[V2_NATIVE_RESULT]`);
        console.log(`Nenhum float veio embutido nativamente na primeira chamada V2.`);
    }

    // 5. Teste de Link de Inspect (Tenta achar na V2, se não, caça na V1)
    const v2Actions = extractActionsArray(targetItem.actions);
    const v2RawLink = targetItem.inspectlink || targetItem.inspect_link || v2Actions.find(a => a.link && a.link.includes('csgo_econ_action_preview'))?.link || null;
    
    const v2FormattedLink = v2RawLink ? v2RawLink.replace('%owner_steamid%', steamId64).replace('%assetid%', assetId).replace('%listingid%', '0') : null;
    
    const isV2Censored = v2FormattedLink ? v2FormattedLink.includes('propid') : false;

    // Se a V2 censurou (Trade Lock), vamos ver se a V1 tem o link!
    const resolveV1Link = () => {
        if (!v1Res || !v1Res.data) return null;
        const v1Data = v1Res.data as V1InventoryResponse;
        const asset = (v1Data.assets || []).find(a => String(a.assetid) === assetId);
        if (!asset) return null;
        const desc = (v1Data.descriptions || []).find(d => d.classid === asset.classid && d.instanceid === asset.instanceid);
        if (!desc) return null;
        
        const v1Actions = extractActionsArray(desc.actions);
        const v1Link = v1Actions.find(a => a.link && a.link.includes('csgo_econ_action_preview'))?.link || null;
        
        return v1Link ? v1Link.replace('%owner_steamid%', steamId64).replace('%assetid%', assetId).replace('%listingid%', '0') : null;
    };

    const finalInspectLink = (!isV2Censored && v2FormattedLink) ? v2FormattedLink : resolveV1Link();

    console.log(`\nInspect Link: ${finalInspectLink || 'NENHUM LINK VÁLIDO ENCONTRADO (Censurado/Trade Lock)'}`);
    console.log(`Veio da V2?: ${(!isV2Censored && v2FormattedLink) ? 'SIM' : 'NÃO'}`);

    // 6. Teste da API de Inspect Ativa
    if (finalInspectLink) {
        console.log(`\n[DISPARANDO_API_INSPECT] Testando endpoint /api/v2/items/inspect...`);
        try {
            const inspectRes = await axios.get('https://csinventoryapi.com/api/v2/items/inspect', {
                params: { api_key: apiKey, url: finalInspectLink },
                timeout: 8000
            });
            
            const info = inspectRes.data?.iteminfo || inspectRes.data?.data?.iteminfo || inspectRes.data?.data || inspectRes.data;
            const apiFloat = info.floatvalue ?? info.float_value ?? info.paintwear;
            const apiPattern = info.paintseed ?? info.pattern;

            console.log(`\n[API_INSPECT_RESULT]`);
            console.log(`Status: SUCESSO`);
            console.log(`Float: ${apiFloat}`);
            console.log(`Pattern: ${apiPattern ?? 'N/A'}`);
            
        } catch (err: unknown) {
            console.log(`\n[API_INSPECT_RESULT]`);
            console.log(`Status: FALHOU`);
            console.log(`Motivo: ${err instanceof Error ? err.message : 'Timeout ou erro desconhecido da CSInventory API'}`);
        }
    } else {
        console.log(`\n[API_INSPECT_RESULT]`);
        console.log(`Status: IGNORADO (Não temos um Inspect Link válido para enviar)`);
    }

    console.log(`==================================================\n`);

    return NextResponse.json({ message: "Teste concluído. Olhe seu terminal." });

  } catch (err: unknown) {
    console.log(`\n[ERRO CRÍTICO NO SCRIPT] ${err instanceof Error ? err.message : 'Erro'}`);
    return NextResponse.json({ error: "Falha" }, { status: 500 });
  }
}