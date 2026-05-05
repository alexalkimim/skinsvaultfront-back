import { NextResponse } from 'next/server';
import axios from 'axios';
import { engine } from '@/lib/CurrencyEngine';
import { fetchAllPrices, fetchExchangeRate, prisma } from '@/lib/priceService';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// --- INTERFACES ESTREITAS ---
interface ActionItem {
  link?: string;
  name?: string;
}

interface SteamNativeAsset {
  assetid: string;
  classid: string;
  instanceid: string;
}

interface SteamNativeDescription {
  classid: string;
  instanceid: string;
  market_hash_name?: string;
  name?: string;
  actions?: ActionItem[] | Record<string, ActionItem>;
  market_actions?: ActionItem[] | Record<string, ActionItem>;
}

interface InvItemV2 {
  id?: string;
  assetid?: string;
  market_hash_name?: string;
  name?: string;
  amount?: string | number;
  icon_url?: string;
  icon_url_large?: string;
  image?: string;
  inspect_link?: string;
  inspectlink?: string;
  float_value?: number | string;
  floatvalue?: number | string;
  paintwear?: number | string;
  paintseed?: number | string;
  pattern?: number | string;
  phase?: string;
  fade_percent?: number | string;
  fade?: number | string;
  float?: Record<string, unknown>; // Pega qualquer objeto aninhado
}

interface InspectData {
  float: number | null;
  pattern: number | null;
  phase: string | null;
  fade: number | null;
}

interface InspectCacheEntry extends InspectData {
  inspectLink: string;
}

interface ProcessedItem {
  id: string;
  assetid: string;
  name: string;
  cleanName: string;
  image: string | null;
  amount: number;
  isStatTrak: boolean;
  isSouvenir: boolean;
  wear: string | null;
  inspectLink: string | null;
  buffBRL: string;
  youpinBRL: string;
  float: number | null;
  pattern: number | null;
  phase: string | null;
  fade: number | null;
  tradeLockedFloat: boolean; 
}

type InspectResultPayload = {
  item: ProcessedItem;
  data: unknown;
  status: 'fulfilled' | 'rejected';
};

// 🔥 FILTRO VISUAL: Apenas armas/facas/luvas recebem Inspect
const isInspectableItem = (name: string): boolean => {
  const lowerName = name.toLowerCase();
  if (/(sticker|patch|graffiti|case|capsule|package|music kit|agent|pin|key|pass|ticket|tool|sealed)/.test(lowerName)) return false;
  return true;
};

// 🔥 RAIZ UNIVERSAL: Remove TUDO que não for letra/número para cruzar V2 com Steam Native perfeitamente
const getMatchKey = (name: string): string => {
  return name.replace(/stattrak|souvenir|[^a-zA-Z0-9]/gi, '').toLowerCase();
};

const extractActionsArray = (actionsData?: ActionItem[] | Record<string, ActionItem>): ActionItem[] => {
  if (!actionsData) return [];
  if (Array.isArray(actionsData)) return actionsData;
  return Object.values(actionsData);
};

// 🔥 EXTRATOR BLINDADO: Impede que strings "0.15" quebrem a tipagem
const extractNumber = (val: unknown): number | null => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? null : parsed;
  }
  return null;
};

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Acesso negado." }, { status: 401 });

  const timerGlobalStart = Date.now();

  try {
    const body = await request.json();
    const tradeLink = (body.tradeLink || body.url || body.link || "").toString().trim();
    
    if (!tradeLink) return NextResponse.json({ error: "Link não informado." }, { status: 400 });

    const apiKey = process.env.CSINVENTORY_API_KEY || "";
    
    console.log(`\n==================================================`);
    console.log(`[PIPELINE] Passo 1: Resolvendo Trade Link...`);
    
    const steamIdRes = await axios.get('https://csinventoryapi.com/api/v2/steam/tradeurl', {
      params: { api_key: apiKey, url: tradeLink },
      timeout: 10000
    });
    
    const steamId64 = steamIdRes.data.steamid64 as string;
    if (!steamId64) return NextResponse.json({ error: "Falha ao converter Trade Link." }, { status: 400 });
    
    console.log(`[PIPELINE] SteamID64: ${steamId64}`);
    console.log(`[PIPELINE] Passo 2: Carga Paralela V2 (Cotação) + STEAM NATIVE (Dicionário Limpo)...`);

    const timerParallelStart = Date.now();
    
    // 🚀 ENGINE V2 (Financeiro) + INVASÃO STEAM NATIVE (Visual)
    const [v2Res, steamNativeRes, , buffMap, youpinMap] = await Promise.all([
      axios.get('https://csinventoryapi.com/api/v2/inventory', { params: { api_key: apiKey, appid: 730, tradelink: tradeLink }, timeout: 25000 }),
      axios.get(`https://steamcommunity.com/inventory/${steamId64}/730/2`, { 
        params: { l: 'english', count: 2000 },
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }).catch(() => null),
      fetchExchangeRate(),
      fetchAllPrices('buff163', apiKey),
      fetchAllPrices('youpin', apiKey)
    ]);
    
    console.log(`[PERFORMANCE] Fontes requisitadas em ${Date.now() - timerParallelStart}ms`);

    const rawV2Data = v2Res.data;
    const possibleItems = rawV2Data?.data?.items || rawV2Data?.items || rawV2Data?.data || rawV2Data || [];
    const v2Items: InvItemV2[] = Array.isArray(possibleItems) ? possibleItems : (typeof possibleItems === 'object' ? Object.values(possibleItems) : []);

    if (v2Items.length === 0) {
        return NextResponse.json({ error: "Inventário privado ou vazio." }, { status: 404 });
    }
    
    // Log de diagnóstico ativado para inspecionarmos o payload cru da V2 se necessário
    console.log(`[DEBUG] Amostra do primeiro item V2 recebido:`, JSON.stringify(v2Items[0]).substring(0, 200) + '...');

    // 🧬 CONSTRUÇÃO DO DICIONÁRIO DE LINKS (Steam Native)
    const nativeNameMap = new Map<string, string[]>();
    let totalLinksExtraidos = 0;
    
    if (steamNativeRes && steamNativeRes.data && steamNativeRes.data.assets) {
        const assets: SteamNativeAsset[] = steamNativeRes.data.assets;
        const descriptions: SteamNativeDescription[] = steamNativeRes.data.descriptions || [];
        
        const descMap = new Map<string, SteamNativeDescription>();
        descriptions.forEach(d => descMap.set(`${d.classid}_${d.instanceid}`, d));
        
        assets.forEach(asset => {
            const desc = descMap.get(`${asset.classid}_${asset.instanceid}`);
            if (desc) {
                const rawName = (desc.market_hash_name || desc.name || "").trim();
                if (!isInspectableItem(rawName)) return; 

                const allActions = [...extractActionsArray(desc.actions), ...extractActionsArray(desc.market_actions)];
                const linkObj = allActions.find(a => a.link && a.link.includes('csgo_econ_action_preview') && !a.link.includes('propid'));
                
                if (linkObj && linkObj.link) {
                    const perfectLink = linkObj.link
                        .replace('%owner_steamid%', steamId64)
                        .replace('%assetid%', String(asset.assetid))
                        .replace('%listingid%', '0');
                        
                    // A MÁGICA DO MATCH CEGO: Salva pela Raiz Universal
                    const matchKey = getMatchKey(rawName);
                    if (!nativeNameMap.has(matchKey)) nativeNameMap.set(matchKey, []);
                    nativeNameMap.get(matchKey)!.push(perfectLink);
                    totalLinksExtraidos++;
                }
            }
        });
        console.log(`[SIDECAR_NATIVE] Invasão bem sucedida. Extraídos ${totalLinksExtraidos} links perfeitos em gavetas nominais.`);
    } else {
        console.log(`[SIDECAR_NATIVE] Steam não retornou dados (Perfil Privado ou Queda).`);
    }

    const logElegiveis: string[] = [];
    const logMatchSucesso: string[] = [];
    const logTradeLocked: string[] = [];

    // 💰 CONSOLIDAÇÃO (V2 FINANCEIRO + NATIVE VISUAL)
    const baseProcessedItems: ProcessedItem[] = v2Items.map((item): ProcessedItem => {
      const name = (item.market_hash_name || item.name || "Unknown").trim();
      const qty = Number(item.amount || 1);
      
      const bCNY = buffMap.get(name) || 0;
      const rawYCNY = youpinMap.get(name) || 0;
      const needsFallback = rawYCNY === 0 || bCNY <= 0.10 || (bCNY > 0 && (rawYCNY > bCNY * 2 || rawYCNY < bCNY * 0.5));
      const yCNY = needsFallback ? bCNY : rawYCNY;

      const icon = item.icon_url || item.icon_url_large || item.image || "";
      const finalImage = icon ? `https://steamcommunity-a.akamaihd.net/economy/image/${icon}/360fx360f` : null;

      const cleanName = name
        .replace(/StatTrak™?\s*/gi, '')
        .replace(/Souvenir\s*/gi, '')
        .replace(/\s*\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)/gi, '')
        .trim();

      const assetId = String(item.assetid || item.id || '');
      const isEligible = isInspectableItem(name);
      
      // 🔥 A BUSCA CEGA: Pegamos a raiz do nome e roubamos o link direto da Steam Native
      const matchKey = getMatchKey(name);
      const resolveInspectLink = () => {
          if (!isEligible) return null;
          const fallbackLinks = nativeNameMap.get(matchKey);
          if (fallbackLinks && fallbackLinks.length > 0) {
              return fallbackLinks.pop() || null; 
          }
          return null; 
      };

      const finalInspectLink = resolveInspectLink();
      
      // Checa todas as possibilidades que a V2 pode mandar embutido, só por garantia
      const inlineFloat = extractNumber(item.float_value) ?? extractNumber(item.floatvalue) ?? extractNumber(item.paintwear) ?? extractNumber(item.float?.floatvalue);
      const inlinePattern = extractNumber(item.paintseed) ?? extractNumber(item.pattern) ?? extractNumber(item.float?.paintseed);
      const inlinePhase = item.phase ?? (typeof item.float?.phase === 'string' ? item.float.phase : null);
      const inlineFade = extractNumber(item.fade_percent) ?? extractNumber(item.fade) ?? extractNumber(item.float?.fade_percent);

      const needsInspect = isEligible && inlineFloat === null;
      // Se não tem link da Steam Native, está trancada no inventário (Trade Lock)
      const isTradeLocked = needsInspect && finalInspectLink === null;

      if (isEligible) logElegiveis.push(cleanName);
      if (needsInspect && finalInspectLink) logMatchSucesso.push(cleanName);
      if (isTradeLocked) logTradeLocked.push(cleanName);

      return {
        id: Math.random().toString(36).substring(2, 11),
        assetid: assetId,
        name,
        cleanName,
        image: finalImage,
        amount: qty,
        isStatTrak: name.includes('StatTrak™'),
        isSouvenir: name.includes('Souvenir'),
        wear: (name.match(/\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)/) || [])[1] || null,
        inspectLink: finalInspectLink,
        buffBRL: String(engine.converterPreco(bCNY * qty, 'CNY', 'buff')),
        youpinBRL: String(engine.converterPreco(yCNY * qty, 'CNY', 'youpin')),
        float: inlineFloat,
        pattern: inlinePattern,
        phase: inlinePhase,
        fade: inlineFade,
        tradeLockedFloat: isTradeLocked
      };
    });

    console.log(`\n==================================================`);
    console.log(`[INSPECT_CROSS_MATCH]`);
    console.log(`Total de Armas/Facas Elegíveis no V2: ${logElegiveis.length}`);
    console.log(`Links resgatados da Steam Native com Sucesso: ${logMatchSucesso.length}`);
    console.log(`Itens Bloqueados (Trade Lock / Steam não revelou): ${logTradeLocked.length}`);

    // 🔥 O CACHE BLINDADO
    const itemsToInspect = baseProcessedItems.filter(i => i.inspectLink !== null && !i.tradeLockedFloat && i.float === null);
    const inspectLinksToFetch = itemsToInspect.map(i => i.inspectLink as string);

    const cachedInspects = await prisma.inspectCache.findMany({
      where: { 
          inspectLink: { in: inspectLinksToFetch },
          float: { not: null } 
      }
    });
    
    const cachedMap = new Map<string, InspectData>(
      cachedInspects.map((c: InspectCacheEntry) => [
        c.inspectLink, 
        { float: c.float, pattern: c.pattern, phase: c.phase, fade: c.fade }
      ])
    );
    
    const missingItems = itemsToInspect.filter(i => !cachedMap.has(i.inspectLink as string));

    if (missingItems.length > 0) {
      console.log(`[INSPECT_V2] Consultando a API para ${missingItems.length} skins não cacheadas...`);
      
      const INSPECT_CHUNK = 20;
      const inspectChunks = Array.from(
        { length: Math.ceil(missingItems.length / INSPECT_CHUNK) },
        (_, i) => missingItems.slice(i * INSPECT_CHUNK, i * INSPECT_CHUNK + INSPECT_CHUNK)
      );

      const allInspectResults: InspectCacheEntry[] = [];

      for (const chunk of inspectChunks) {
        const chunkPromises = chunk.map(async (item: ProcessedItem): Promise<InspectResultPayload> => {
          try {
            const res = await axios.get('https://csinventoryapi.com/api/v2/items/inspect', {
              params: { api_key: apiKey, url: item.inspectLink },
              timeout: 4500 
            });
            return { item, data: res.data, status: 'fulfilled' };
          } catch {
            return { item, data: null, status: 'rejected' };
          }
        });

        const results = await Promise.all(chunkPromises);
        
        const validResults = results.map((res: InspectResultPayload): InspectCacheEntry | null => {
          if (res.status === 'fulfilled' && res.data) {
            const payload = res.data as Record<string, unknown>;
            const dataObj = payload.data as Record<string, unknown> | undefined;
            const itemInfo = (payload.iteminfo || dataObj?.iteminfo || dataObj || payload) as Record<string, unknown>;
            
            const floatVal = extractNumber(itemInfo.floatvalue) ?? extractNumber(itemInfo.float_value) ?? extractNumber(itemInfo.paintwear);
            const patternVal = extractNumber(itemInfo.paintseed) ?? extractNumber(itemInfo.pattern);
            const phaseVal = typeof itemInfo.phase === 'string' ? itemInfo.phase : (typeof payload.phase === 'string' ? payload.phase : null);
            const fadeVal = extractNumber(itemInfo.fade_percent) ?? extractNumber(itemInfo.fade);

            if (floatVal !== null || patternVal !== null) {
                return {
                  inspectLink: res.item.inspectLink as string,
                  float: floatVal,
                  pattern: patternVal,
                  phase: phaseVal,
                  fade: fadeVal,
                };
            }
          }
          return null;
        }).filter((c): c is InspectCacheEntry => c !== null);

        allInspectResults.push(...validResults);
      }

      if (allInspectResults.length > 0) {
        await prisma.inspectCache.createMany({
          data: allInspectResults,
          skipDuplicates: true
        });
        allInspectResults.forEach((c: InspectCacheEntry) => {
          cachedMap.set(c.inspectLink, { float: c.float, pattern: c.pattern, phase: c.phase, fade: c.fade });
        });
        console.log(`[CACHE] ${allInspectResults.length} floats válidos blindados e salvos no banco.`);
      }
      console.log(`==================================================\n`);
    } else if (itemsToInspect.length > 0) {
        console.log(`[CACHE] Sucesso! Floats faltantes carregados instantaneamente da memória local.`);
        console.log(`==================================================\n`);
    }

    // 🔄 O MERGE FINAL
    const finalProcessed = baseProcessedItems.map((item): ProcessedItem => {
      if (item.inspectLink && cachedMap.has(item.inspectLink)) {
        const data = cachedMap.get(item.inspectLink);
        return { 
          ...item, 
          float: data?.float ?? item.float, 
          pattern: data?.pattern ?? item.pattern, 
          phase: data?.phase ?? item.phase, 
          fade: data?.fade ?? item.fade 
        };
      }

      if (item.inspectLink && !cachedMap.has(item.inspectLink) && item.float === null) {
         return { ...item, tradeLockedFloat: true };
      }

      return item;
    });

    const totalBuff = finalProcessed.reduce((acc: number, curr: ProcessedItem) => acc + (Number(curr.buffBRL) || 0), 0);
    const totalYoupin = finalProcessed.reduce((acc: number, curr: ProcessedItem) => acc + (Number(curr.youpinBRL) || 0), 0);

    console.log(`[PIPELINE_END] Cotação Completa encerrada em ${Date.now() - timerGlobalStart}ms`);

    return NextResponse.json({
      totalBuff: totalBuff.toFixed(2), 
      totalYoupin: totalYoupin.toFixed(2),
      totalItems: finalProcessed.length,
      items: finalProcessed
        .sort((a: ProcessedItem, b: ProcessedItem) => Number(b.buffBRL) - Number(a.buffBRL))
        .map((i: ProcessedItem) => ({ 
          ...i,
          buffBRL: Number(i.buffBRL).toFixed(2), 
          youpinBRL: Number(i.youpinBRL).toFixed(2)
        }))
    });
  } catch (err: unknown) {
    const errorReal = err instanceof Error ? err.message : "Erro desconhecido";
    console.error(`\n[ERROR] Falha na Cotação: ${errorReal}\n`);
    return NextResponse.json({ error: errorReal }, { status: 500 });
  }
}