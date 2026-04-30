import { NextResponse } from 'next/server';
import axios from 'axios';

// 🔥 Cache Supremo de Imagens na RAM (Salva as fotos sem precisar do Prisma!)
const memoriaGlobal = global as unknown as { skinImageCache: Map<string, string> };
if (!memoriaGlobal.skinImageCache) {
  memoriaGlobal.skinImageCache = new Map<string, string>();
}
const imageCache = memoriaGlobal.skinImageCache;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name');
  
  // Imagem reserva caso a skin falhe
  const placeholder = 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXXOsBG0PvdWFZVF11sQO_GzM_IR117IAJ7s-b3egZ2x_DOeHIXvYqzzNCOx_WjZOjRlD9QvZd3ib7EpdWkjlKy_EJuMj3zI9QhjQ/200fx200f';

  if (!name) return NextResponse.redirect(placeholder);

  // 1. Se já está salvo na RAM, entrega em 0 milissegundos!
  if (imageCache.has(name)) {
    return NextResponse.redirect(imageCache.get(name)!);
  }

  // 🔥 ERRO DO ESLINT CORRIGIDO: Usando 'const' em vez de 'let'
  const clean = name.replace(/Sapphire|Emerald|Ruby|Black Pearl|Phase 1|Phase 2|Phase 3|Phase 4/gi, "").replace(/\(\)/g, "").replace(/\s{2,}/g, " ").trim();

  try {
    // 2. Busca no CSFloat a foto real com desgaste
    const csFloatUrl = `https://csfloat.com/api/v1/listings?market_hash_name=${encodeURIComponent(clean)}&limit=1`;
    const res = await axios.get(csFloatUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 4000 });
    
    if (res.data?.[0]?.item?.icon_url) {
      const url = `https://community.cloudflare.steamstatic.com/economy/image/${res.data[0].item.icon_url}/200fx200f`;
      imageCache.set(name, url); // Salva na RAM para a próxima vez
      return NextResponse.redirect(url);
    }
  } catch {}
  
  try {
    // 3. Fallback: Steam Market
    const steamUrl = `https://steamcommunity.com/market/search/render/?query=${encodeURIComponent(`"${clean}"`)}&appid=730&count=1&norender=1`;
    const steamRes = await axios.get(steamUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 4000 });
    const iconUrl = steamRes.data?.results?.[0]?.asset_description?.icon_url;
    
    if (iconUrl) {
      const url = `https://community.cloudflare.steamstatic.com/economy/image/${iconUrl}/200fx200f`;
      imageCache.set(name, url); // Salva na RAM
      return NextResponse.redirect(url);
    }
  } catch {}

  return NextResponse.redirect(placeholder);
}