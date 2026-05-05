import type { NextConfig } from "next";

// 🔥 OTIMIZAÇÃO DE TERMINAL: Silenciador Cirúrgico do Next.js
if (process.env.NODE_ENV === 'development') {
  const originalWrite = process.stdout.write.bind(process.stdout);
  
  process.stdout.write = (
    chunk: string | Uint8Array,
    encodingOrCb?: BufferEncoding | ((err?: Error | null) => void),
    cb?: (err?: Error | null) => void
  ): boolean => {
    // Filtro do spam
    if (typeof chunk === 'string' && chunk.includes('GET /api/cotar/imagens')) {
      return true;
    }
    
    // Type Guard 1: Se o segundo argumento for a função de callback
    if (typeof encodingOrCb === 'function') {
      return originalWrite(chunk, encodingOrCb);
    }
    
    // Type Guard 2: Se o segundo argumento for o encoding (string)
    if (typeof encodingOrCb === 'string') {
      return originalWrite(chunk, encodingOrCb, cb);
    }
    
    // Fallback: Apenas o chunk
    return originalWrite(chunk);
  };
}

const nextConfig: NextConfig = {};

export default nextConfig;