import { NextResponse } from 'next/server';
import { engine } from '@/lib/CurrencyEngine';
import { fetchAllPrices, fetchExchangeRate } from '@/lib/priceService';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: Request) {
  // Opcional: Manter proteção de rota se apenas usuários logados puderem cotar
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Acesso negado." }, { status: 401 });

  try {
    const body = await request.json();
    
    // 🔥 Capturamos EXATAMENTE o que o frontend envia
    const skinName = body.skinName?.toString().trim();

    if (!skinName) {
      return NextResponse.json({ error: "Nome da skin não informado." }, { status: 400 });
    }

    const apiKey = process.env.CSINVENTORY_API_KEY || "";
    
    // Atualiza o câmbio do dia
    await fetchExchangeRate();
    
    // Bebe da mesma fonte de dados (cache) do inventário
    const [buffMap, youpinMap] = await Promise.all([
      fetchAllPrices('buff163', apiKey),
      fetchAllPrices('youpin', apiKey)
    ]);

    // Busca o preço purificado em YUAN (CNY)
    const bCNY = buffMap.get(skinName) || 0;
    const rawYCNY = youpinMap.get(skinName) || 0;

    if (bCNY === 0 && rawYCNY === 0) {
      return NextResponse.json({ error: "Preço não encontrado para esta skin." }, { status: 404 });
    }

    // A MÁGICA: A mesma trava de segurança contra distorções do inventário
    const needsFallback = rawYCNY === 0 || bCNY <= 0.10 || (bCNY > 0 && (rawYCNY > bCNY * 2 || rawYCNY < bCNY * 0.5));
    const yCNY = needsFallback ? bCNY : rawYCNY;

    // Converte usando a engine perfeita
    const buffBRL = engine.converterPreco(bCNY, 'CNY', 'buff');
    const youpinBRL = engine.converterPreco(yCNY, 'CNY', 'youpin');

    // Monta o payload EXATAMENTE como a interface ItemAvulso do frontend exige
    return NextResponse.json({
      name: skinName,
      buffBRL: buffBRL.toFixed(2),
      youpinBRL: youpinBRL.toFixed(2),
      youpinOriginalCNY: yCNY,
      youpinCNYComTaxa: yCNY * 1.01,
      cnyBrl: engine.cambio.CNY_BRL
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("❌ ERRO COTADOR ITEM AVULSO:", msg);
    return NextResponse.json({ error: "Falha ao processar o item." }, { status: 500 });
  }
}