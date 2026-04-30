"use client"

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Phone, Loader2, LogOut } from 'lucide-react';

export default function Onboarding() {
  const { data: session, update } = useSession();
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);

  const finalizar = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/update-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone }),
      });

      if (res.ok) {
        // Primeiro: Avisa o NextAuth para atualizar o cookie internamente
        await update({ telefone });
        
        // Segundo: Dá um tempo para o cookie ser gravado
        alert("Cadastro concluído com sucesso! Redirecionando...");
        
        // Terceiro: FORÇA o navegador a recarregar tudo do zero no Perfil
        // Isso mata qualquer cache de sessão antigo
        window.location.assign('/perfil');
      } else {
        alert("Erro ao salvar no servidor.");
      }
    } catch (err) {
      alert("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] flex items-center justify-center px-6">
      <div className="max-w-md w-full space-y-8 bg-[#080809] border border-white/5 p-10 rounded-4xl text-center">
        <Phone className="text-purple-500 mx-auto" size={40} />
        <h1 className="text-2xl font-bold text-white">Finalizar Cadastro</h1>
        <p className="text-zinc-500 text-sm">Olá {session?.user?.email}, digite seu telefone:</p>
        
        <input
          type="tel"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-4"
          placeholder="(00) 00000-0000"
        />

        <button
          onClick={finalizar}
          disabled={loading || !telefone}
          className="w-full bg-purple-600 py-4 rounded-xl text-white font-bold hover:bg-purple-700 transition-all cursor-pointer"
        >
          {loading ? <Loader2 className="animate-spin mx-auto" size={24} /> : "ATIVAR CONTA"}
        </button>

        <button onClick={() => signOut()} className="text-zinc-600 text-xs mt-6 block mx-auto underline">
          Sair da conta
        </button>
      </div>
    </main>
  );
}