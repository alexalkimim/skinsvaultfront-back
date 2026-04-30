"use client"

import { ArrowRight, TrendingUp, Shield, Globe, Layers, Command } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero Section - Full Width & Modern */}
      <section className="relative pt-20 pb-32 px-8 overflow-hidden">
        <div className="max-w-[1440px] mx-auto relative z-10">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-purple-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
              </span>
              Nova versão 2.0 disponível
            </div>
            
            <h1 className="text-6xl md:text-[100px] font-bold tracking-[-0.04em] leading-[0.9] text-white mb-10">
              A inteligência por trás do seu <span className="text-zinc-500">inventário.</span>
            </h1>
            
            <p className="text-zinc-400 text-lg md:text-xl font-medium leading-relaxed max-w-2xl mb-12">
              Gerencie suas skins de CS2 com uma interface projetada para clareza e precisão. Acompanhe o mercado, analise lucros e organize sua coleção em tempo real.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              <button 
                onClick={() => router.push('/cadastro')}
                className="px-8 py-4 bg-white text-black font-bold text-sm rounded-full hover:bg-zinc-200 transition-all flex items-center gap-2 group"
              >
                Começar agora
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => router.push('/login')}
                className="px-8 py-4 bg-white/[0.03] border border-white/[0.08] text-white font-bold text-sm rounded-full hover:bg-white/[0.06] transition-all"
              >
                Fazer login
              </button>
            </div>
          </div>
        </div>

        {/* Abstract Background Elements */}
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full h-full pointer-events-none z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-purple-600/[0.03] blur-[120px] rounded-full" />
        </div>
      </section>

      {/* Features Grid - Clean & Spaced */}
      <section className="px-8 py-24 border-t border-white/[0.03] bg-[#080809]/50">
        <div className="max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            <div className="space-y-6">
              <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-purple-500">
                <TrendingUp size={20} />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Análise em tempo real</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Acompanhe as variações de preço e o valor total do seu patrimônio com dados atualizados do mercado global.
              </p>
            </div>

            <div className="space-y-6">
              <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-purple-500">
                <Shield size={20} />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Segurança de nível SaaS</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Seus dados são protegidos por criptografia de ponta a ponta e autenticação robusta via NextAuth.
              </p>
            </div>

            <div className="space-y-6">
              <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-purple-500">
                <Globe size={20} />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Ecossistema Conectado</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Integração direta com APIs de mercado para garantir que suas decisões sejam baseadas em dados reais.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section - Integrating with background */}
      <section className="px-8 py-32 relative">
        <div className="max-w-[1440px] mx-auto">
          <div className="bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.08] rounded-[2rem] p-1 overflow-hidden">
            <div className="bg-[#050505] rounded-[1.8rem] p-12 md:p-20 flex flex-col md:flex-row items-center gap-20">
              <div className="flex-1 space-y-8">
                <div className="inline-flex items-center gap-2 text-purple-500 font-bold text-[10px] uppercase tracking-[0.2em]">
                  <Layers size={14} />
                  Interface Profissional
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
                  Projetado para colecionadores exigentes.
                </h2>
                <p className="text-zinc-400 text-lg leading-relaxed">
                  Esqueça planilhas confusas. Tenha uma visão clara de cada skin, cada centavo investido e cada lucro realizado em uma dashboard elegante.
                </p>
                <div className="flex items-center gap-8 pt-4">
                  <div>
                    <div className="text-2xl font-bold text-white tracking-tight">100%</div>
                    <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Responsivo</div>
                  </div>
                  <div className="h-10 w-[1px] bg-white/10" />
                  <div>
                    <div className="text-2xl font-bold text-white tracking-tight">Cloud</div>
                    <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Sincronizado</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full aspect-video bg-white/[0.02] border border-white/[0.08] rounded-2xl relative overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <Command size={48} className="text-zinc-800" />
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Minimalist */}
      <footer className="px-8 py-20 border-t border-white/[0.03]">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="space-y-4">
            <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-white">SKINVAULT</h2>
            <p className="text-zinc-600 text-xs font-medium">© 2026 SkinVault. Todos os direitos reservados.</p>
          </div>
          <div className="flex gap-12">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-white uppercase tracking-widest">Produto</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-zinc-500 hover:text-white text-xs transition-colors">Funcionalidades</a></li>
                <li><a href="#" className="text-zinc-500 hover:text-white text-xs transition-colors">Segurança</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-white uppercase tracking-widest">Suporte</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-zinc-500 hover:text-white text-xs transition-colors">Ajuda</a></li>
                <li><a href="#" className="text-zinc-500 hover:text-white text-xs transition-colors">Termos</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
