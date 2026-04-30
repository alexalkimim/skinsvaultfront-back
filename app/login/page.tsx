"use client"

import { useState, useEffect, Suspense } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

// Componente isolado para gerenciar os formulários e parâmetros de busca
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [verSenha, setVerSenha] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // Captura erros silenciosos do NextAuth enviados via URL
  useEffect(() => {
    if (urlError === "Callback") {
      setMensagemErro("Erro de comunicação com o servidor de autenticação. O banco de dados pode estar indisponível.");
    } else if (urlError === "CredentialsSignin") {
      setMensagemErro("E-mail ou senha incorretos.");
    }
  }, [urlError]);

  const tratarLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !senha) return;
    
    const t0 = performance.now();
    console.log("[FRONTEND_PERF] Iniciando requisição de login...");
    
    setCarregando(true);
    setMensagemErro(null);

    try {
      const resposta = await signIn('credentials', {
        redirect: false,
        email,
        senha,
      });

      const t1 = performance.now();
      console.log(`[FRONTEND_PERF] Resposta do NextAuth recebida em ${(t1 - t0).toFixed(2)}ms`, resposta);

      if (resposta?.error) {
        setMensagemErro("Credenciais inválidas ou erro no servidor.");
        setCarregando(false);
        return;
      }

      if (resposta?.ok) {
        console.log("[FRONTEND_LOGIN] Redirecionando...");
        router.push('/entrada');
        router.refresh();
      }
    } catch (error) {
      console.error("[FRONTEND_ERROR] Erro na requisição:", error);
      setMensagemErro("Ocorreu um erro interno. Verifique sua conexão.");
      setCarregando(false);
    }
  };

  const fazerLoginGoogle = () => {
    const t0 = performance.now();
    console.log("[FRONTEND_PERF] Iniciando fluxo do Google...");
    signIn('google', { callbackUrl: '/entrada' });
    const t1 = performance.now();
    console.log(`[FRONTEND_PERF] Fluxo OAuth acionado em ${(t1 - t0).toFixed(2)}ms`);
  };

  return (
    <div className="bg-white/[0.02] border border-white/[0.08] p-10 rounded-[2.5rem] backdrop-blur-md shadow-2xl">
      <form onSubmit={tratarLogin} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">E-mail</label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-white transition-colors" />
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/[0.08] rounded-2xl text-sm text-white focus:border-white/20 outline-none transition-all placeholder:text-zinc-800"
              placeholder="seu@email.com"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Senha</label>
            <Link href="/recuperar-senha" className="text-[9px] font-bold text-zinc-600 hover:text-white uppercase tracking-widest transition-colors">Esqueceu?</Link>
          </div>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-white transition-colors" />
            <input 
              type={verSenha ? "text" : "password"} 
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-black/40 border border-white/[0.08] rounded-2xl text-sm text-white focus:border-white/20 outline-none transition-all placeholder:text-zinc-800"
              placeholder="••••••••"
              required
            />
            <button 
              type="button"
              onClick={() => setVerSenha(!verSenha)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700 hover:text-white transition-colors"
            >
              {verSenha ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {mensagemErro && (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs font-bold uppercase tracking-wider text-red-500 animate-in fade-in">
            <AlertTriangle size={16} />
            <span className="text-left">{mensagemErro}</span>
          </div>
        )}

        <button 
          type="submit" 
          disabled={carregando}
          className="w-full bg-white text-black font-bold py-4 rounded-2xl transition-all shadow-xl hover:bg-zinc-200 text-xs uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 mt-4 group"
        >
          <span>{carregando ? 'Processando...' : 'Entrar na plataforma'}</span>
          {!carregando && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
        </button>
      </form>

      <div className="flex items-center gap-4 my-10">
          <div className="h-[1px] bg-white/[0.05] flex-1"></div>
          <span className="text-zinc-700 text-[9px] font-bold uppercase tracking-widest">ou use sua conta</span>
          <div className="h-[1px] bg-white/[0.05] flex-1"></div>
      </div>

      <button 
        type="button"
        onClick={fazerLoginGoogle}
        className="w-full flex items-center justify-center gap-3 bg-white/[0.02] hover:bg-white/[0.05] text-white border border-white/[0.08] font-bold py-4 rounded-2xl transition-all text-xs uppercase tracking-widest"
      >
        <svg className="w-4 h-4" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Google
      </button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#050505] flex items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/[0.03] blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-[420px] animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center mb-12">
          <Link href="/" className="text-sm font-bold tracking-[0.3em] uppercase text-white hover:opacity-80 transition-opacity">
            SKINVAULT
          </Link>
          <p className="text-zinc-500 text-xs font-medium mt-4">Acesse sua plataforma de gestão.</p>
        </div>

        {/* O Suspense é vital aqui para a performance do Next.js ao ler parâmetros de URL */}
        <Suspense fallback={<div className="text-white text-center">Carregando formulário...</div>}>
          <LoginForm />
        </Suspense>

        <div className="mt-12 text-center space-y-4">
          <p className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest">
            Não tem uma conta? <Link href="/cadastro" className="text-white hover:opacity-70 ml-1 transition-opacity">Cadastre-se</Link>
          </p>
          <div className="flex items-center justify-center gap-3 text-[9px] text-zinc-800 uppercase font-bold tracking-[0.2em]">
            <ShieldCheck size={12} className="text-zinc-800" />
            Criptografia de 256 bits
          </div>
        </div>
      </div>
    </main>
  );
}