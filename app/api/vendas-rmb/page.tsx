"use client"

import { useState } from 'react';
import { DollarSign, ArrowRight, ArrowDownLeft, ArrowUpRight, TrendingUp, Calendar, Filter } from 'lucide-react';

interface RmbTransaction {
  id: string;
  type: 'SKIN_SALE' | 'MANUAL_IN' | 'BALANCE_SALE';
  platform: string;
  amountYuan: number;
  feePercent?: number; // Para entradas
  origin?: string; // Saldo Skins ou Alipay
  avgCostBrl?: number; // Custo médio BRL/RMB
  exchangeRateSold?: number; // Para saídas (Cotação de venda)
  date: string;
  notes: string;
}

export default function RmbPage() {
  const [transactions, setTransactions] = useState<RmbTransaction[]>([]);
  
  // --- ESTADOS DO FORMULÁRIO DE ENTRADA (Registrar RMB) ---
  const [inPlatform, setInPlatform] = useState('Buff');
  const [inAmount, setInAmount] = useState('');
  const [inFee, setInFee] = useState('');
  const [inOrigin, setInOrigin] = useState('Saldo Skins');
  const [inAvgCost, setInAvgCost] = useState('');
  const [inDate, setInDate] = useState(new Date().toISOString().split('T')[0]);
  const [inNotes, setInNotes] = useState('');

  // --- ESTADOS DO FORMULÁRIO DE SAÍDA (Vender RMB) ---
  const [outAmount, setOutAmount] = useState('');
  const [outRate, setOutRate] = useState('');
  const [outPlatform, setOutPlatform] = useState('Alipay');
  const [outDate, setOutDate] = useState(new Date().toISOString().split('T')[0]);
  const [outNotes, setOutNotes] = useState('');

  const [activeTab, setActiveTab] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');

  const totalYuanDisponivel = transactions.reduce((acc, t) => {
    // Se for entrada (Venda de skin ou depósito manual), soma. Se for saída (Venda de saldo), subtrai.
    return t.type === 'BALANCE_SALE' ? acc - t.amountYuan : acc + t.amountYuan;
  }, 0);

  const handleRegistrarEntrada = () => {
    if (!inAmount || parseFloat(inAmount) <= 0) return alert("Digite um valor válido em Yuan.");
    
    const newTx: RmbTransaction = {
      id: Date.now().toString(),
      type: 'MANUAL_IN',
      platform: inPlatform,
      amountYuan: parseFloat(inAmount),
      feePercent: parseFloat(inFee) || 0,
      origin: inOrigin,
      avgCostBrl: parseFloat(inAvgCost) || 0,
      date: inDate,
      notes: inNotes
    };
    
    setTransactions([newTx, ...transactions]);
    setInAmount(''); setInFee(''); setInAvgCost(''); setInNotes('');
  };

  const handleVenderRMB = () => {
    if (!outAmount || parseFloat(outAmount) <= 0) return alert("Digite um valor válido em Yuan.");
    if (parseFloat(outAmount) > totalYuanDisponivel) return alert("Saldo insuficiente!");

    const newTx: RmbTransaction = {
      id: Date.now().toString(),
      type: 'BALANCE_SALE',
      platform: outPlatform, // Para onde foi direcionado
      amountYuan: parseFloat(outAmount),
      exchangeRateSold: parseFloat(outRate) || 0,
      date: outDate,
      notes: outNotes
    };

    setTransactions([newTx, ...transactions]);
    setOutAmount(''); setOutRate(''); setOutNotes('');
  };

  return (
    <main className="min-h-screen bg-[#050505] pb-32">
      
      {/* HEADER */}
      <header className="border-b border-white/5 bg-[#080809]/50 backdrop-blur-md px-8 pt-16 pb-12">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-2">Gestão de RMB / Yuan</h1>
          <p className="text-zinc-500 text-lg font-medium mb-10">Controle o seu saldo em plataformas chinesas e vendas diretas.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 p-6 rounded-3xl relative overflow-hidden md:col-span-2">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-500/20 p-2.5 rounded-xl text-blue-400"><DollarSign size={20} /></div>
                <h3 className="text-xs font-bold text-blue-400/70 uppercase tracking-widest">Total Disponível (YUAN)</h3>
              </div>
              <p className="text-4xl font-bold text-blue-400">¥ {totalYuanDisponivel.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-8 py-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LADO ESQUERDO: AÇÕES (ENTRADA / SAÍDA) */}
        <div className="lg:col-span-5 space-y-6">
            
            <div className="flex bg-black/40 border border-white/10 rounded-2xl p-1">
                <button onClick={() => setActiveTab('ENTRADA')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${activeTab === 'ENTRADA' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Registrar RMB (In)</button>
                <button onClick={() => setActiveTab('SAIDA')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${activeTab === 'SAIDA' ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}>Vender RMB (Out)</button>
            </div>

            {activeTab === 'ENTRADA' && (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 animate-in fade-in">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><ArrowDownLeft className="text-green-400" size={20}/> Entrada de Saldo</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Plataforma</label>
                            <select value={inPlatform} onChange={(e) => setInPlatform(e.target.value)} className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-sm text-white outline-none appearance-none">
                                <option value="Buff">Buff163</option><option value="Youpin">Youpin</option><option value="C5">C5Game</option><option value="Outros">Outros</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Quantidade (YUAN)</label>
                            <input type="number" step="0.01" value={inAmount} onChange={(e) => setInAmount(e.target.value)} placeholder="0.00" className="w-full bg-black/40 border border-green-500/30 px-4 py-3 rounded-xl text-sm text-green-400 font-bold outline-none focus:border-green-400" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Taxa da Plataforma (%)</label>
                                <input type="number" step="0.01" value={inFee} onChange={(e) => setInFee(e.target.value)} placeholder="Ex: 2.5" className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-sm text-white outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Custo Médio BRL/RMB</label>
                                <input type="number" step="0.001" value={inAvgCost} onChange={(e) => setInAvgCost(e.target.value)} placeholder="Ex: 0.78" className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-sm text-white outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Origem do Saldo</label>
                            <select value={inOrigin} onChange={(e) => setInOrigin(e.target.value)} className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-sm text-white outline-none appearance-none">
                                <option value="Saldo Skins">Venda de Skins</option><option value="Alipay">Depósito Direto (Alipay)</option><option value="Outros">Outros</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Data</label>
                                <input type="date" value={inDate} onChange={(e) => setInDate(e.target.value)} className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-sm text-white outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Notas / Descrição</label>
                            <input type="text" value={inNotes} onChange={(e) => setInNotes(e.target.value)} placeholder="Opcional..." className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-sm text-white outline-none" />
                        </div>
                        <button onClick={handleRegistrarEntrada} className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-xl transition-colors text-xs uppercase tracking-widest mt-2">
                            Salvar Entrada RMB
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'SAIDA' && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-3xl p-8 animate-in fade-in">
                    <h2 className="text-lg font-bold text-blue-400 mb-6 flex items-center gap-2"><ArrowUpRight size={20}/> Vender Saldo RMB</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-blue-400/50 uppercase tracking-widest mb-1 block">Quantidade Vendida (YUAN)</label>
                            <input type="number" step="0.01" value={outAmount} onChange={(e) => setOutAmount(e.target.value)} placeholder="0.00" className="w-full bg-black/40 border border-blue-500/30 px-4 py-3 rounded-xl text-lg text-white font-bold outline-none focus:border-blue-400" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-blue-400/50 uppercase tracking-widest mb-1 block">Cotação da Venda (Ex: 0.82)</label>
                            <input type="number" step="0.001" value={outRate} onChange={(e) => setOutRate(e.target.value)} placeholder="0.820" className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-sm text-white outline-none focus:border-blue-400" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-blue-400/50 uppercase tracking-widest mb-1 block">Direcionado para (Plataforma Destino)</label>
                            <select value={outPlatform} onChange={(e) => setOutPlatform(e.target.value)} className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-sm text-white outline-none appearance-none">
                                <option value="Alipay">Cliente - Alipay</option><option value="WeChat">Cliente - WeChat</option><option value="Buff">Transferência Buff</option><option value="Youpin">Transferência Youpin</option><option value="Outros">Outros</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-blue-400/50 uppercase tracking-widest mb-1 block">Data da Venda</label>
                                <input type="date" value={outDate} onChange={(e) => setOutDate(e.target.value)} className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-sm text-white outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-blue-400/50 uppercase tracking-widest mb-1 block">Descrição</label>
                            <input type="text" value={outNotes} onChange={(e) => setOutNotes(e.target.value)} placeholder="Ex: Venda para o João" className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-sm text-white outline-none" />
                        </div>
                        <button onClick={handleVenderRMB} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-colors text-xs uppercase tracking-widest mt-2">
                            Confirmar Venda
                        </button>
                    </div>
                </div>
            )}

        </div>

        {/* LADO DIREITO: HISTÓRICO */}
        <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">Histórico de Transações</h2>
            </div>

            <div className="space-y-3">
                {transactions.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 border border-white/5 rounded-3xl">
                        <TrendingUp size={48} className="mx-auto text-zinc-800 mb-4" />
                        <p className="text-zinc-500 font-bold uppercase tracking-widest">Nenhuma movimentação registrada.</p>
                    </div>
                ) : (
                    transactions.map((tx) => (
                        <div key={tx.id} className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex items-center justify-between hover:bg-white/[0.04] transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${tx.type === 'BALANCE_SALE' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>
                                    {tx.type === 'BALANCE_SALE' ? <ArrowUpRight size={20}/> : <ArrowDownLeft size={20}/>}
                                </div>
                                <div>
                                    <p className="font-bold text-white text-sm">
                                        {tx.type === 'BALANCE_SALE' ? 'Venda de Saldo' : tx.type === 'SKIN_SALE' ? 'Venda de Skin' : 'Entrada Manual'}
                                    </p>
                                    <p className="text-xs text-zinc-500 mt-0.5">{tx.platform} • {new Date(tx.date).toLocaleDateString('pt-BR')}</p>
                                    {tx.notes && <p className="text-xs text-zinc-400 mt-1 italic">"{tx.notes}"</p>}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`font-bold ${tx.type === 'BALANCE_SALE' ? 'text-blue-400' : 'text-green-400'}`}>
                                    {tx.type === 'BALANCE_SALE' ? '-' : '+'} ¥ {tx.amountYuan.toFixed(2)}
                                </p>
                                {tx.type === 'BALANCE_SALE' && tx.exchangeRateSold && (
                                    <p className="text-[10px] text-zinc-500 font-bold mt-1">Cotação: {tx.exchangeRateSold}</p>
                                )}
                                {tx.type !== 'BALANCE_SALE' && tx.avgCostBrl > 0 && (
                                    <p className="text-[10px] text-zinc-500 font-bold mt-1">Custo Médio: R$ {tx.avgCostBrl}</p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

      </div>
    </main>
  );
}