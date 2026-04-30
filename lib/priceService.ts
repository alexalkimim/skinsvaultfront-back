import axios from 'axios';
import { engine } from './CurrencyEngine';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

if (!globalForPrisma.prisma) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  globalForPrisma.prisma = new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

interface ItemPriceInfo {
  sell_price_cents?: { usd?: string | number };
  sell_price?: string | number;
}

export async function fetchExchangeRate() {
  try {
    const { data } = await axios.get('https://economia.awesomeapi.com.br/last/USD-BRL,CNY-BRL', { timeout: 8000 });
    
    // 🔥 FINE TUNING 1: Mid-Market Rate (Média de Mercado usada por Google e BUFF)
    const usdMid = (Number(data.USDBRL.bid) + Number(data.USDBRL.ask)) / 2;
    const cnyMid = (Number(data.CNYBRL.bid) + Number(data.CNYBRL.ask)) / 2;
    
    engine.atualizarCambio(usdMid, cnyMid); 
  } catch {
    console.warn(`Falha na API de câmbio.`);
  }
}

export async function fetchAllPrices(source: string, apiKey: string) {
  const UMA_HORA = 60 * 60 * 1000;
  const agora = new Date().getTime();
  
  // Atualizado para v2 para forçar o cache a recriar com a nova precisão decimal
  const cacheKey = `${source}_cny_v2`;

  try {
    const cache = await prisma.tabelaPreco.findUnique({ where: { fonte: cacheKey } });
    if (cache && (agora - new Date(cache.updatedAt).getTime() < UMA_HORA)) {
      const priceMap = new Map<string, number>();
      const dados = cache.dados as Record<string, number>;
      for (const [name, price] of Object.entries(dados)) {
        priceMap.set(name, price);
      }
      return priceMap;
    }
  } catch (e) { console.error("Erro no cache:", e); }

  const { data } = await axios.get('https://csinventoryapi.com/api/v2/prices', {
    timeout: 60000,
    params: { api_key: apiKey, source, app_id: 730 },
  });

  const priceMap = new Map<string, number>();
  const jsonParaSalvar: Record<string, number> = {};
  const pricesObj = data.data || data.items || data;

  // 🔥 FINE TUNING 2: Precisão de 4 casas decimais para o cross-rate da API
  const CSINVENTORY_USD_TO_CNY_RATE = 6.8331;

  for (const [name, info] of Object.entries<unknown>(pricesObj)) {
    if (name === 'success' || name === 'message' || name === 'error') continue;
    
    const itemInfo = info as ItemPriceInfo;
    
    // 🔥 FINE TUNING 3: Proteção Float. Mantém em centavos para a multiplicação!
    const rawCentsUSD = itemInfo?.sell_price_cents?.usd 
      ? Number(itemInfo.sell_price_cents.usd) 
      : Number(itemInfo?.sell_price || 0) * 100;
    
    // Multiplica enquanto é um inteiro grande, SÓ depois divide por 100.
    const priceCNY = (rawCentsUSD * CSINVENTORY_USD_TO_CNY_RATE) / 100;
    
    priceMap.set(name, priceCNY);
    jsonParaSalvar[name] = priceCNY;
  }

  await prisma.tabelaPreco.upsert({
    where: { fonte: cacheKey },
    update: { dados: jsonParaSalvar, updatedAt: new Date() },
    create: { fonte: cacheKey, dados: jsonParaSalvar }
  });

  return priceMap;
}