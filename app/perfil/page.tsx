"use client"

import { useState, useEffect } from 'react';
import { 
  User, ShieldCheck, 
  ChevronRight, CreditCard, LogOut,
  Star, Info, Layout, Loader2, Phone
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface ItemHistorico {
  id: string; 
  tipo: string; 
  nome: string; 
  imagem: string; 
  condicao: string;
  quantidade: number; 
  valorPago: string; 
  dataCompra: string; 
  status: string;
}

export default function Perfil() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [isMounted, setIsMounted] = useState(false);
  
  // O estado de histórico começa vazio e limpo de qualquer localStorage antigo
  const [historico] = useState<ItemHistorico[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);

    // SEGURANÇA ADICIONAL: Se o usuário logar mas não tiver telefone, manda pro Onboarding
    if (status === "authenticated" && session?.user) {
      if (!session.user.telefone) {
        router.push('/onboarding');
      }
    }
  }, [session, status, router]);

  const stats = historico.reduce((acc, item) => {
    const pago = parseFloat(item.valorPago) || 0;
    acc.investido += pago * item.quantidade;
    return acc;
  }, { investido: 0 });

  // 1. Estado de Carregamento
  if (!isMounted || status === "loading") {
    return (
      <main className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </main>
    );
  }

  // 2. Estado Não Autenticado
  if (!session) {
    return (
      <main className="min-h-screen bg-[#050505] flex items-center justify-center flex-col gap-4">
        <p className="text-white text-sm font-bold tracking-widest uppercase">Acesso Restrito</p>
        <button 
          onClick={() => router.push('/login')} 
          className="bg-purple-600 px-6 py-3 rounded-xl text-white font-bold text-xs uppercase tracking-widest"
        >
          Fazer Login
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] pb-20">
      {/* HEADER DO PERFIL */}
      <header className="border-b border-white/3 bg-[#080809]/50 backdrop-blur-md px-8 py-20">
        <div className="max-w-360 mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="relative">
            <div className="w-40 h-40 bg-white/2 border border-white/8 rounded-4xl flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-linear-to-tr from-purple-500/10 to-transparent opacity-50" />
              {session.user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.image} alt={session.user.name || "User"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <User size={64} className="text-zinc-400 group-hover:text-white transition-colors duration-500" />
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-purple-600 p-3 rounded-2xl border-4 border-[#080809] shadow-2xl">
              <ShieldCheck size={20} className="text-white" />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
              <h1 className="text-4xl font-bold text-white tracking-tight">{session.user?.name || "Colecionador"}</h1>
              <span className="bg-white/3 border border-white/8 text-purple-400 text-[9px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full">
                Plano {session.user?.plan || 'Free'}
              </span>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-6 mb-8 text-zinc-500">
               <p className="text-lg font-medium">{session.user?.email}</p>
               {session.user?.telefone && (
  <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-lg border border-white/5">
    <Phone size={12} className="text-purple-400" />
    <span className="text-[10px] font-bold text-zinc-300">{session.user.telefone}</span>
  </div>
)}
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <div className="bg-white/2 border border-white/5 px-8 py-4 rounded-2xl">
                <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Patrimônio</div>
                <div className="text-xl font-bold text-white tracking-tight">R$ {stats.investido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
              </div>
              <div className="bg-white/2 border border-white/5 px-8 py-4 rounded-2xl">
                <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Itens</div>
                <div className="text-xl font-bold text-white tracking-tight">{historico.length} Unidades</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="px-8 py-16 max-w-360 mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* MENU LATERAL */}
          <div className="lg:col-span-4 space-y-10">
            <div>
              <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em] mb-6 ml-2">Configurações da Conta</h3>
              <div className="space-y-2">
                {[
                  { label: 'Perfil Público', sub: 'Gerencie como outros te veem', icon: User },
                  { label: 'Assinatura & Faturamento', sub: 'Planos e métodos de pagamento', icon: CreditCard },
                  { label: 'Preferências do Sistema', sub: 'Moeda, idioma e tema', icon: Layout },
                  { label: 'Segurança', sub: '2FA e chaves de acesso', icon: ShieldCheck }
                ].map((item, i) => (
                  <button key={i} className="w-full group flex items-center justify-between p-6 bg-white/1 border border-white/3 rounded-2xl hover:bg-white/3 hover:border-white/8 transition-all">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-white/3 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <item.icon size={20} className="text-zinc-500 group-hover:text-white transition-colors" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">{item.label}</div>
                        <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">{item.sub}</div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-zinc-800 group-hover:text-white transition-colors" />
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center justify-between p-6 bg-red-500/2 border border-red-500/8 rounded-2xl hover:bg-red-500/5 transition-all group"
            >
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
                  <LogOut size={20} className="text-red-500" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-red-500">Encerrar Sessão</div>
                  <div className="text-[10px] text-red-500/40 font-bold uppercase tracking-widest mt-0.5">Sair com segurança</div>
                </div>
              </div>
            </button>
          </div>

          {/* HISTÓRICO DE ATIVIDADE */}
          <div className="lg:col-span-8 space-y-12">
            <div>
              <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em] mb-6 ml-2">Histórico de Atividade</h3>
              <div className="bg-white/1 border border-white/3 rounded-4xl overflow-hidden">
                {historico.length === 0 ? (
                  <div className="py-24 text-center">
                    <Info size={32} className="text-zinc-800 mx-auto mb-4" />
                    <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">Nenhuma atividade recente</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/3">
                    {historico.map(item => (
                      <div key={item.id} className="p-8 flex items-center justify-between hover:bg-white/1 transition-colors">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 bg-black/40 rounded-2xl p-2 border border-white/5 flex items-center justify-center">
                            {item.imagem && item.imagem !== "" ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.imagem} className="w-full h-full object-contain" alt={item.nome || "Item"} />
                            ) : (
                              <div className="w-4 h-4 bg-white/10 rounded-full" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white mb-1">{item.nome}</div>
                            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Adicionado em {item.dataCompra}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-emerald-400">R$ {parseFloat(item.valorPago).toFixed(2)}</div>
                          <div className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest mt-1">Compra efetuada</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-12 flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/2 border border-white/5 rounded-2xl mb-6">
                <Star size={14} className="text-purple-500" />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                  Membro desde Abril 2026
                </span>
              </div>
              <p className="text-zinc-800 text-[9px] font-bold uppercase tracking-[0.4em]">SkinsVault Cloud Infrastructure</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}