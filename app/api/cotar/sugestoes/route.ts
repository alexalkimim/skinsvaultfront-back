import { NextResponse } from 'next/server';
import { prisma } from '@/lib/priceService';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const memoriaGlobal = global as unknown as {
  nomesDasSkins: string[];
  imagensDasSkins: Record<string, string>;
  bancoCarregado: boolean;
};

if (!memoriaGlobal.nomesDasSkins) {
  memoriaGlobal.nomesDasSkins = [];
  memoriaGlobal.imagensDasSkins = {};
  memoriaGlobal.bancoCarregado = false;
}

function carregarBancoLocal() {
  if (memoriaGlobal.bancoCarregado) return;
  try {
    let fileContent = '';
    const pathsToTry = [
      path.join(process.cwd(), 'skins.json'),
      path.join(process.cwd(), 'public', 'skins.json'),
      path.join(process.cwd(), 'src', 'skins.json')
    ];

    for (const p of pathsToTry) {
      try {
        fileContent = fs.readFileSync(p, 'utf-8');
        break;
      } catch {}
    }

    if (!fileContent) return;
    
    try { JSON.parse(fileContent); } catch {
      const lastValidIndex = fileContent.lastIndexOf('}, "');
      if (lastValidIndex !== -1) fileContent = fileContent.substring(0, lastValidIndex + 1) + '}';
    }

    const data = JSON.parse(fileContent);
    for (const key in data) {
      if (data[key]?.image) memoriaGlobal.imagensDasSkins[key.toLowerCase()] = data[key].image;
      
      // GARANTIA EXTRA: Preenche os nomes caso o banco de dados falhe
      if (!memoriaGlobal.nomesDasSkins.includes(key)) {
          memoriaGlobal.nomesDasSkins.push(key);
      }
    }
    memoriaGlobal.bancoCarregado = true;
    console.log(`✅ [IMAGENS] skins.json lido! ${Object.keys(memoriaGlobal.imagensDasSkins).length} imagens prontas.`);
  } catch (e) {
    console.error("❌ ERRO GRAVE ao processar skins.json!", e);
  }
}

// 🔥 O CAÇADOR DE SKINS NOVAS (Busca Kukri e outras)
async function cacadorDeImagens(nomeSkin: string): Promise<string | null> {
    const clean = nomeSkin.replace(/Sapphire|Emerald|Ruby|Black Pearl|Phase\s*\d/gi, "").replace(/\(\)/g, "").replace(/\s{2,}/g, " ").trim();
    
    try {
        const csFloatUrl = `https://csfloat.com/api/v1/listings?market_hash_name=${encodeURIComponent(clean)}&limit=1`;
        const res = await axios.get(csFloatUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 1500 });
        if (res.data?.[0]?.item?.icon_url) {
            return `https://community.cloudflare.steamstatic.com/economy/image/${res.data[0].item.icon_url}/200fx200f`;
        }
    } catch {}

    // A API da Steam é a salvadora para skins muito recentes
    try {
        const steamUrl = `https://steamcommunity.com/market/search/render/?query=${encodeURIComponent(`"${clean}"`)}&appid=730&count=1&norender=1`;
        const steamRes = await axios.get(steamUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 2000 });
        const iconUrl = steamRes.data?.results?.[0]?.asset_description?.icon_url;
        if (iconUrl) {
            return `https://community.cloudflare.steamstatic.com/economy/image/${iconUrl}/200fx200f`;
        }
    } catch {}

    return null;
}

function limparParaBusca(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function traduzirTermo(palavra: string): string[] {
  const dicionario: Record<string, string[]> = {
    "policamuflagem": ["buckshot"],
    "limao": ["lemon"],
    "chumbo": ["buckshot"],
    "grosso": ["buckshot"],
    "especialista": ["specialist"],
    "motorista": ["driver"],
    "faca": ["knife", "karambit", "bayonet", "butterfly", "m9", "talon", "stiletto", "kukri", "navaja", "ursus", "bowie", "falchion", "huntsman", "gut", "nomad", "paracord", "survival", "skeleton"],
    "luva": ["gloves", "handwraps"],
    "luvas": ["gloves", "handwraps"],
    "safira": ["sapphire"],
    "esmeralda": ["emerald"],
    "rubi": ["ruby"],
    "perola": ["blackpearl"],
    "teia": ["web"],
    "escarlate": ["crimson"],
    "massacre": ["slaughter"],
    "degra": ["fade"],
    "doze": ["nova", "xm1014", "sawedoff", "mag7"],
    "ak": ["ak47"],
    "m4": ["m4a4", "m4a1s"],
    "fn": ["factorynew"],
    "mw": ["minimalwear"],
    "ft": ["fieldtested"],
    "ww": ["wellworn"],
    "bs": ["battlescarred"]
  };
  return dicionario[palavra] || [palavra];
}

export async function GET(req: Request) {
  // 1. O CADEADO: Verifica se quem está chamando a API tem uma sessão válida
  const session = await getServerSession(authOptions);
  
  if (!session) {
    console.warn("🚫 Tentativa de acesso não autorizado na busca de skins.");
    return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  }

  // 2. Carrega o banco local se necessário
  carregarBancoLocal();

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim();
    if (!query || query.length < 2) return NextResponse.json([]);

    // 3. Fallback inteligente para o Prisma (caso o banco esteja resetado)
    if (memoriaGlobal.nomesDasSkins.length === 0) {
      try {
        const cacheDB = await prisma.tabelaPreco.findUnique({ where: { fonte: 'buff163' } });
        if (cacheDB && cacheDB.dados) {
            memoriaGlobal.nomesDasSkins = Object.keys(cacheDB.dados as Record<string, number>);
        }
      } catch (error) {
        console.warn("⚠️ Tabela de preços vazia/inexistente. Usando nomes do skins.json como fallback.");
      }
      
      // Se mesmo depois do Prisma a lista estiver vazia, forçamos o uso do json
      if (memoriaGlobal.nomesDasSkins.length === 0) {
         memoriaGlobal.nomesDasSkins = Object.keys(memoriaGlobal.imagensDasSkins);
      }
    }

    const palavrasQuery = query.toLowerCase().split(/\s+/).map(p => p.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

    const resultados = [];
    let fetchCount = 0; // Limite para não atrasar a sua digitação

    for (const nomeSkin of memoriaGlobal.nomesDasSkins) {
      if (nomeSkin.toLowerCase().includes("graffiti")) continue;
      
      const nomeBaseLimpo = limparParaBusca(nomeSkin);
      const match = palavrasQuery.every(palavra => {
        const traducoes = traduzirTermo(palavra);
        return traducoes.some(t => nomeBaseLimpo.includes(t));
      });

      if (match) {
        const nomeLower = nomeSkin.toLowerCase();
        let imageUrl = memoriaGlobal.imagensDasSkins[nomeLower] || null;
        
        // Busca Fuzzy Genérica (Safira, Rubi, Fases)
        if (!imageUrl) {
            const baseName = nomeLower.split('(')[0].trim();
            const gems = ['ruby', 'emerald', 'sapphire', 'black pearl'];
            const gemEncontrada = gems.find(g => nomeLower.includes(g));
            const phaseMatch = nomeLower.match(/phase\s*\d/i);
            const phaseEncontrada = phaseMatch ? phaseMatch[0] : null;

            for (const key in memoriaGlobal.imagensDasSkins) {
                if (key.includes(baseName)) {
                    if (gemEncontrada && !key.includes(gemEncontrada)) continue;
                    if (phaseEncontrada && !key.includes(phaseEncontrada)) continue;
                    imageUrl = memoriaGlobal.imagensDasSkins[key];
                    break;
                }
            }
        }

        // SE A SKIN FOR KUKRI OU NOVA, CAÇA NA INTERNET AGORA!
        if (!imageUrl && fetchCount < 2) {
            fetchCount++;
            imageUrl = await cacadorDeImagens(nomeSkin);
            if (imageUrl) memoriaGlobal.imagensDasSkins[nomeLower] = imageUrl; // Aprende a skin para sempre!
        }

        resultados.push({ name: nomeSkin, image: imageUrl });
        if (resultados.length >= 25) break; 
      }
    }

    return NextResponse.json(resultados);
  } catch (error) {
    return NextResponse.json([]);
  }
}