import { NextResponse } from 'next/server';
import axios from 'axios';
import { engine } from '@/lib/CurrencyEngine';
import { fetchAllPrices, fetchExchangeRate } from '@/lib/priceService';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

interface InvItem {
  market_hash_name?: string;
  name?: string;
  amount?: string | number;
  icon_url?: string;
  icon_url_large?: string;
  image?: string;
  actions?: { link: string }[];
  market_actions?: { link: string }[];
  inspect_link?: string;
}

// 🔥 FILTRO INTELIGENTE DE TOKENS (HEURÍSTICA)
const requiresAdvancedInspect = (name: string): boolean => {
  const lowerName = name.toLowerCase();
  
  // 1. Blacklist: Lixo e Itens Estáticos (NÃO GASTA TOKEN)
  if (/(sticker|patch|graffiti|case|capsule|package|music kit|agent|pin|key)/.test(lowerName)) {
    return false;
  }
  
  // 2. Whitelist Master: Facas e Luvas (SEMPRE INSPECIONA)
  if (lowerName.includes('★')) return true;

  // 3. Whitelist Específica: Patterns que mudam o preço absurdamente
  const highTierPatterns = [
    'fade', 'doppler', 'case hardened', 'crimson web', 'slaughter', 
    'howl', 'dragon lore', 'fire serpent', 'medusa', 'gungnir', 
    'wild lotus', 'prince', 'emerald', 'sapphire', 'ruby', 'black pearl'
  ];
  
  return highTierPatterns.some(kw => lowerName.includes(kw));
};

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Acesso negado." }, { status: 401 });

  try {
    const body = await request.json();
    const tradeLink = (body.tradeLink || body.url || body.link || "").toString().trim();
    
    if (!tradeLink) return NextResponse.json({ error: "Link não informado." }, { status: 400 });

    const apiKey = process.env.CSINVENTORY_API_KEY || "";
    
    const invRes = await axios.get('https://csinventoryapi.com/api/v2/inventory', {
      params: { api_key: apiKey, appid: 730, tradelink: tradeLink },
      timeout: 35000
    });

    const rawData = invRes.data;
    const possibleItems = rawData?.data?.items || rawData?.items || rawData?.data || rawData || [];
    const items: InvItem[] = Array.isArray(possibleItems) ? possibleItems : (typeof possibleItems === 'object' ? Object.values(possibleItems) : []);

    if (items.length === 0) return NextResponse.json({ error: "Inventário privado ou vazio." }, { status: 404 });

    await fetchExchangeRate();
    const [buffMap, youpinMap] = await Promise.all([
      fetchAllPrices('buff163', apiKey),
      fetchAllPrices('youpin', apiKey)
    ]);

    const processed = items.map((item) => {
      const name = (item.market_hash_name || item.name || "Unknown").trim();
      const qty = Number(item.amount || 1);
      
      const icon = item.icon_url || item.icon_url_large || item.image || "";
      const finalImage = icon ? (icon.startsWith('http') ? icon : `https://community.cloudflare.steamstatic.com/economy/image/${icon}`) : null;

      const bCNY = buffMap.get(name) || 0;
      const rawYCNY = youpinMap.get(name) || 0;
      const needsFallback = rawYCNY === 0 || bCNY <= 0.10 || (bCNY > 0 && (rawYCNY > bCNY * 2 || rawYCNY < bCNY * 0.5));
      const yCNY = needsFallback ? bCNY : rawYCNY;

      const isStatTrak = name.includes('StatTrak™');
      const isSouvenir = name.includes('Souvenir');
      const wearMatch = name.match(/\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)/);
      const wear = wearMatch ? wearMatch[1] : null;

      // 🔥 NOME LIMPO E PROFISSIONAL (Aplicado em todo o backend)
      const cleanName = name
        .replace(/StatTrak™\s*/g, '')
        .replace(/Souvenir\s*/g, '')
        .replace(/\s*\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)/i, '')
        .trim();

      // Montando o link de inspect para uso posterior
      let inspectLink = item.inspect_link || null;
      if (!inspectLink && item.actions && item.actions.length > 0) {
        inspectLink = item.actions[0].link;
      }
      
      return {
        id: Math.random().toString(36).substr(2, 9),
        name,
        cleanName,
        image: finalImage,
        amount: qty,
        isStatTrak,
        isSouvenir,
        wear,
        inspectLink,
        buffBRL: engine.converterPreco(bCNY * qty, 'CNY', 'buff'),
        youpinBRL: engine.converterPreco(yCNY * qty, 'CNY', 'youpin'),
        float: null as number | null,
        pattern: null as number | null,
        phase: null as string | null,
        fade: null as number | null,
      };
    });

    // 🔥 GASTO INTELIGENTE DE TOKENS (Apenas nos itens que importam)
    const itemsToInspect = processed.filter(item => item.inspectLink && requiresAdvancedInspect(item.name));
    
    if (itemsToInspect.length > 0) {
      console.log(`🔍 [INSPECT] Poupando Tokens: Inspecionando apenas ${itemsToInspect.length} de ${processed.length} itens.`);
      
      const inspectPromises = itemsToInspect.map(item => 
        axios.get('https://csinventoryapi.com/api/v2/items/inspect', {
          params: { api_key: apiKey, inspect_link: item.inspectLink },
          timeout: 10000
        }).catch(() => null)
      );

      const inspectResults = await Promise.allSettled(inspectPromises);

      itemsToInspect.forEach((item, index) => {
        const res = inspectResults[index];
        if (res.status === 'fulfilled' && res.value?.data) {
          const inspectData = res.value.data.data || res.value.data.iteminfo || res.value.data;
          item.float = inspectData.floatvalue || inspectData.float || null;
          item.pattern = inspectData.paintseed || inspectData.pattern || null;
          item.phase = inspectData.phase || null;
          item.fade = inspectData.fade_percent || inspectData.fade || null;
        }
      });
    }

    const totalBuff = processed.reduce((acc, curr) => acc + (Number(curr.buffBRL) || 0), 0);
    const totalYoupin = processed.reduce((acc, curr) => acc + (Number(curr.youpinBRL) || 0), 0);

    return NextResponse.json({
      totalBuff: totalBuff.toFixed(2), 
      totalYoupin: totalYoupin.toFixed(2),
      totalItems: processed.length,
      items: processed
        .sort((a, b) => Number(b.buffBRL) - Number(a.buffBRL))
        .map(i => ({ 
          ...i, 
          buffBRL: Number(i.buffBRL).toFixed(2), 
          youpinBRL: Number(i.youpinBRL).toFixed(2)
        }))
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Falha no inventário";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}