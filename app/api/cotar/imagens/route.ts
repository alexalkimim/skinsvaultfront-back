import { NextResponse } from 'next/server';

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return new NextResponse('URL não fornecida', { status: 400 });
  }

  try {
    // Faz o fetch da imagem na Steam/Akamai
    const res = await fetch(url, { cache: 'force-cache' });
    const buffer = await res.arrayBuffer();

    // Retorna a imagem com CORS totalmente aberto e cache de 1 ano
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: unknown) {
    return new NextResponse('Falha ao carregar imagem', { status: 500 });
  }
}