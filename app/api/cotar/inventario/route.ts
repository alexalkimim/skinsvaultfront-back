import { NextResponse } from 'next/server';
import axios from 'axios';
import { engine } from '@/lib/CurrencyEngine';
import { fetchAllPrices, fetchExchangeRate } from '@/lib/priceService';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// --- INTERFACES ESTRITAS BASEADAS NA DOCUMENTAÇÃO ENVIADA ---
interface V2Item {
    id?: string;
    assetid?: string;
    market_hash_name?: string;
    icon_url?: string;
    image?: string; 
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
    buffBRL: string;
    youpinBRL: string;
    float: null;
    pattern: null;
    phase: null;
    fade: null;
    isEnriching: boolean; 
    tradeLockedFloat: boolean;
}

// Filtra quem recebe Enrich em background
const isInspectableItem = (name: string): boolean => {
    return !/(sticker|patch|graffiti|case|capsule|package|music kit|agent|pin|key|pass|ticket|tool|sealed)/.test(name.toLowerCase());
};

export async function POST(request: Request): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Acesso negado." }, { status: 401 });

    const timerGlobalStart = Date.now();

    try {
        const body = await request.json();
        const tradeLink = (String(body.tradeLink || body.url || body.link || "")).trim();
        if (!tradeLink) return NextResponse.json({ error: "Link não informado." }, { status: 400 });

        const apiKey = process.env.CSINVENTORY_API_KEY || "";

        console.log(`\n==================================================`);
        console.log(`[FASE 1] Lendo V2 Oficial...`);

        // 1. Resolve o SteamID64 (Precisamos mandar para o Front engatilhar o Enrich)
        const steamIdRes = await axios.get('https://csinventoryapi.com/api/v2/steam/tradeurl', {
            params: { api_key: apiKey, url: tradeLink },
            timeout: 10000
        });
        const steamId64 = String(steamIdRes.data.steamid64);

        // 2. PARALELISMO: V2 OBRIGATORIAMENTE PRIMEIRO + COTAÇÕES
        const [v2Res, , buffMap, youpinMap] = await Promise.all([
            axios.get('https://csinventoryapi.com/api/v2/inventory', {
                params: { api_key: apiKey, tradelink: tradeLink, appid: 730 },
                timeout: 20000
            }),
            fetchExchangeRate(),
            fetchAllPrices('buff163', apiKey),
            fetchAllPrices('youpin', apiKey)
        ]);

        // A CORREÇÃO ABSOLUTA DA LEITURA DO JSON:
        // A API retorna { success: true, data: [...] }
        // O Axios empacota em v2Res.data. Logo, a array é v2Res.data.data
        const responseBody = v2Res.data;
        const v2Items: V2Item[] = Array.isArray(responseBody?.data) 
            ? responseBody.data 
            : (Array.isArray(responseBody?.items) ? responseBody.items : []);
        
        if (v2Items.length === 0) {
            return NextResponse.json({ error: "Inventário privado ou vazio." }, { status: 404 });
        }

        // 3. Processamento e Precificação (Apenas Itens Live V2)
        const finalProcessedItems: ProcessedItem[] = v2Items.map((itemV2): ProcessedItem => {
            const name = String(itemV2.market_hash_name || "Unknown").trim();
            
            // A API V2 chama de 'id', mas pode ser 'assetid' em algumas rotas
            const assetId = String(itemV2.assetid || itemV2.id || '');
            
            // O JSON usa 'icon_url'. Precisamos montar o link da Steam.
            const imageStr = itemV2.image || (itemV2.icon_url ? `https://community.akamai.steamstatic.com/economy/image/${itemV2.icon_url}` : null);
            
            const bCNY = buffMap.get(name) || 0;
            const rawYCNY = youpinMap.get(name) || 0;
            const needsFallback = rawYCNY === 0 || bCNY <= 0.10 || (bCNY > 0 && (rawYCNY > bCNY * 2 || rawYCNY < bCNY * 0.5));
            const yCNY = needsFallback ? bCNY : rawYCNY;

            const cleanName = name.replace(/StatTrak™?\s*/gi, '').replace(/Souvenir\s*/gi, '').replace(/\s*\((.*?)\)/gi, '').trim();

            return {
                id: Math.random().toString(36).substring(2, 11),
                assetid: assetId,
                name,
                cleanName,
                image: imageStr,
                amount: 1, // V2 já desmembra os itens da Steam
                isStatTrak: name.includes('StatTrak™'),
                isSouvenir: name.includes('Souvenir'),
                wear: (name.match(/\((.*?)\)/) || [])[1] || null,
                buffBRL: String(engine.converterPreco(bCNY, 'CNY', 'buff')),
                youpinBRL: String(engine.converterPreco(yCNY, 'CNY', 'youpin')),
                
                // DEIXA NULO: O Front renderiza assim, o Worker V1 injeta depois sem quebrar a UI
                float: null,
                pattern: null,
                phase: null,
                fade: null,
                isEnriching: isInspectableItem(name), 
                tradeLockedFloat: false
            };
        });

        const totalBuff = finalProcessedItems.reduce((acc, curr) => acc + (Number(curr.buffBRL) || 0), 0);
        const totalYoupin = finalProcessedItems.reduce((acc, curr) => acc + (Number(curr.youpinBRL) || 0), 0);

        console.log(`[FASE 1 CONCLUÍDA] V2 entregou ${finalProcessedItems.length} itens. TTFB: ${Date.now() - timerGlobalStart}ms`);

        return NextResponse.json({
            steamId64, // Repassa pro React disparar a Fase 3
            totalBuff: totalBuff.toFixed(2), 
            totalYoupin: totalYoupin.toFixed(2),
            totalItems: finalProcessedItems.length,
            items: finalProcessedItems.sort((a, b) => Number(b.buffBRL) - Number(a.buffBRL))
        });

    } catch (err: unknown) {
        const errorReal = err instanceof Error ? err.message : "Erro desconhecido";
        console.error(`\n[ERROR] Falha na Cotação V2: ${errorReal}\n`);
        return NextResponse.json({ error: errorReal }, { status: 500 });
    }
}