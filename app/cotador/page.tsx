"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import html2canvas from 'html2canvas';
import {
  Search, Link as LinkIcon, RefreshCw,
  AlertCircle, Box, X, 
  Filter, CheckSquare, Square, Calculator, Copy, Camera, Download
} from 'lucide-react';

interface SkinCotada {
  id: string;
  name: string;
  cleanName: string;
  image: string | null;
  amount: number;
  buffBRL: string;
  youpinBRL: string;
  isStatTrak: boolean;
  isSouvenir: boolean;
  wear: string | null;
  float: number | null;
  pattern: number | null;
  phase: string | null;
  fade: number | null;
}

interface ItemAvulso {
  id: number;
  name: string;
  cleanName: string;
  image: string | null;
  amount: number;
  buffBRL: string;
  youpinBRL: string;
  youpinOriginalCNY: number;
  youpinCNYComTaxa: number;
  cnyBrl: number;
  wear: string | null;
  isStatTrak: boolean;
  isSouvenir: boolean;
  float: number | null;
  pattern: number | null;
  phase: string | null;
  fade: number | null;
}

interface Sugestao {
  name: string;
  image: string | null;
}

export default function CotadorPage() {
  const [abaAtiva, setAbaAtiva] = useState<'tradelink' | 'avulso'>('tradelink');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [tradeLink, setTradeLink] = useState('');
  const [resultadoInventario, setResultadoInventario] = useState<{ items: SkinCotada[], totalBuff: string, totalYoupin: string } | null>(null);
  const [modoSelecao, setModoSelecao] = useState(false);
  const [itensSelecionados, setItensSelecionados] = useState<Set<string>>(new Set());
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [descontoOferta, setDescontoOferta] = useState("15");
  const [modalImagemAberto, setModalImagemAberto] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const [skinBusca, setSkinBusca] = useState('');
  const [loadingSugestoes, setLoadingSugestoes] = useState(false);
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [sugestaoSelecionada, setSugestaoSelecionada] = useState(-1);
  const [itensAvulsos, setItensAvulsos] = useState<ItemAvulso[]>([]);
  const [itensAvulsosSelecionados, setItensAvulsosSelecionados] = useState<Set<number>>(new Set());
  const [cotacaoCopiada, setCotacaoCopiada] = useState(false);
  const [taxaRepasse, setTaxaRepasse] = useState("0.82");

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) && inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setDropdownAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 🔥 Log de Debug Frontend exato conforme solicitado
  useEffect(() => {
    if (resultadoInventario) {
      const comAtributos = resultadoInventario.items.filter(i => i.float !== null || i.pattern !== null || i.phase !== null);
      if (comAtributos.length > 0) {
        console.log(`\n==================================================`);
        console.log(`[FRONTEND]`);
        console.log(`Dados recebidos para ${comAtributos.length} itens.`);
        console.log(`Exemplo - ${comAtributos[0].cleanName}:`);
        console.log(`float: ${comAtributos[0].float}`);
        console.log(`==================================================\n`);
      }
    }
  }, [resultadoInventario]);

  const handleCotarInventario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradeLink) return;
    setLoading(true);
    setErro(null);
    setResultadoInventario(null);
    setModoSelecao(false);
    setItensSelecionados(new Set());
    setFiltroTipo('todos');

    try {
      const res = await fetch('/api/cotar/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeLink }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na cotação');
      setResultadoInventario(data);
    } catch (error: unknown) {
      setErro(error instanceof Error ? error.message : 'Erro na cotação');
    } finally {
      setLoading(false);
    }
  };

  const itensFiltrados = useMemo(() => {
    if (!resultadoInventario) return [];
    return filtroTipo === 'todos' 
      ? [...resultadoInventario.items]
      : resultadoInventario.items.filter(item => {
          const nome = item.name.toLowerCase();
          const isGraffiti = nome.includes('graffiti');
          if (filtroTipo === 'faca') return !isGraffiti && (nome.includes('knife') || nome.includes('karambit') || nome.includes('bayonet') || nome.includes('butterfly') || nome.includes('daggers') || nome.includes('talon') || nome.includes('navaja') || nome.includes('stiletto') || nome.includes('ursus') || nome.includes('bowie') || nome.includes('falchion') || nome.includes('huntsman') || nome.includes('gut'));
          if (filtroTipo === 'luva') return !isGraffiti && (nome.includes('gloves') || nome.includes('hand wraps') || nome.includes('bloodhound'));
          if (filtroTipo === 'caixa') return !isGraffiti && (nome.includes('case') || nome.includes('capsule') || nome.includes('package'));
          if (filtroTipo === 'adesivo') return !isGraffiti && (nome.includes('sticker') || nome.includes('patch'));
          if (filtroTipo === 'arma') return !isGraffiti && !nome.includes('knife') && !nome.includes('gloves') && !nome.includes('hand wraps') && !nome.includes('case') && !nome.includes('capsule') && !nome.includes('package') && !nome.includes('sticker') && !nome.includes('patch') && !nome.includes('pin') && !nome.includes('music kit');
          return true;
        });
  }, [resultadoInventario, filtroTipo]);

  const totalBuff = useMemo(() => {
    if (!resultadoInventario) return 0;
    if (!modoSelecao) return parseFloat(resultadoInventario.totalBuff);
    return resultadoInventario.items.reduce((acc, item) => itensSelecionados.has(item.id) ? acc + (parseFloat(item.buffBRL) || 0) : acc, 0);
  }, [resultadoInventario, modoSelecao, itensSelecionados]);

  const totalYoupin = useMemo(() => {
    if (!resultadoInventario) return 0;
    if (!modoSelecao) return parseFloat(resultadoInventario.totalYoupin);
    return resultadoInventario.items.reduce((acc, item) => itensSelecionados.has(item.id) ? acc + (parseFloat(item.youpinBRL) || 0) : acc, 0);
  }, [resultadoInventario, modoSelecao, itensSelecionados]);

  const totalMedio = (totalBuff + totalYoupin) / 2;
  const descontoNum = parseFloat(descontoOferta) || 0;
  const valorOferta = totalYoupin * (1 - descontoNum / 100);
  const lucroRealizado = totalYoupin - valorOferta;

  const itensParaModal = useMemo(() => {
    if (!resultadoInventario) return [];
    return resultadoInventario.items.filter(i => itensSelecionados.has(i.id));
  }, [resultadoInventario, itensSelecionados]);

  const exportarImagem = async () => {
    if (!modalRef.current) return;
    try {
      const canvas = await html2canvas(modalRef.current, { 
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: true, 
        allowTaint: false,
      });
      const link = document.createElement('a');
      link.download = `oferta_skins_${new Date().getTime()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error("Erro ao gerar imagem:", err);
    }
  };

  const buscarSugestoes = useCallback((valor: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (valor.length < 2) {
      setSugestoes([]);
      setDropdownAberto(false);
      return;
    }
    setLoadingSugestoes(true);
    setDropdownAberto(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cotar/sugestoes?q=${encodeURIComponent(valor)}`);
        const data: Sugestao[] = await res.json();
        setSugestoes(data);
        setDropdownAberto(true);
        setSugestaoSelecionada(-1);
      } catch {
        setSugestoes([]);
      } finally {
        setLoadingSugestoes(false);
      }
    }, 150);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSkinBusca(val);
    setErro(null);
    buscarSugestoes(val);
  };

  const cotarAvulso = useCallback(async (nome: string, imageStr?: string | null) => {
    if (!nome) return;
    setLoading(true);
    setErro(null);

    try {
      const res = await fetch('/api/cotar/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skinName: nome }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Skin não encontrada');
      
      const cleanName = data.name.replace(/StatTrak™\s*/g, '').replace(/Souvenir\s*/g, '').replace(/\s*\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)/i, '').trim();
      const wearMatch = data.name.match(/\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)/);
      const wear = wearMatch ? wearMatch[1] : null;

      setItensAvulsos(prev => {
        const index = prev.findIndex(item => item.name === data.name);
        const addedId = index !== -1 ? prev[index].id : Date.now();
        setItensAvulsosSelecionados(prevSet => new Set(prevSet).add(addedId));

        if (index !== -1) {
            const newItems = [...prev];
            newItems[index].amount = (newItems[index].amount || 1) + 1;
            return newItems;
        }
        return [{ ...data, cleanName, wear, image: data.image || imageStr || null, amount: 1, id: addedId, isStatTrak: data.name.includes('StatTrak™'), isSouvenir: data.name.includes('Souvenir'), float: null, pattern: null, phase: null, fade: null }, ...prev];
      });
    } catch (error: unknown) {
      setErro(error instanceof Error ? error.message : 'Skin não encontrada');
    } finally {
      setLoading(false);
      setSkinBusca('');
    }
  }, []);

  const toggleSelecaoAvulso = (id: number) => {
    setItensAvulsosSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopiarCotacao = async () => {
    const itensParaCotar = itensAvulsos.filter(item => itensAvulsosSelecionados.has(item.id));
    if (itensParaCotar.length === 0) return;

    const taxaNum = parseFloat(taxaRepasse || "0");

    const itensFormatados = itensParaCotar.map(item => {
      const vendaItem = item.youpinCNYComTaxa * taxaNum;
      const precoCalculado = vendaItem > 0 ? vendaItem : parseFloat(item.buffBRL);
      const precoFormatado = precoCalculado.toFixed(2).replace('.', ',');
      const textoBase = `${item.cleanName}\nR$ ${precoFormatado}`;
      return item.amount > 1 ? `${textoBase} (x${item.amount})` : textoBase;
    });

    const textoSkins = itensFormatados.join('\n\n');

    const totalCalculado = itensParaCotar.reduce((acc, item) => {
      const vendaItem = item.youpinCNYComTaxa * taxaNum;
      const precoUnitario = vendaItem > 0 ? vendaItem : parseFloat(item.buffBRL);
      return acc + (precoUnitario * item.amount);
    }, 0);

    const textoFinal = itensParaCotar.reduce((acc, i) => acc + i.amount, 0) > 1
      ? `${textoSkins}\n\n--------------------------------------------------\n\nValor total das skins:\nR$ ${totalCalculado.toFixed(2).replace('.', ',')}`
      : textoSkins;

    try {
      await navigator.clipboard.writeText(textoFinal);
      setCotacaoCopiada(true);
      setTimeout(() => setCotacaoCopiada(false), 2000);
    } catch (err) {
      console.error("Falha ao copiar:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownAberto) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSugestaoSelecionada(prev => Math.min(prev + 1, sugestoes.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSugestaoSelecionada(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (sugestaoSelecionada >= 0) {
        const sug = sugestoes[sugestaoSelecionada];
        setSkinBusca(''); setDropdownAberto(false); setSugestoes([]);
        cotarAvulso(sug.name, sug.image);
      }
    } else if (e.key === 'Escape') {
      setDropdownAberto(false);
    }
  };

  const handleCotarAvulsoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDropdownAberto(false);
    const sugestaoExata = sugestoes.find(s => s.name.toLowerCase() === skinBusca.toLowerCase());
    await cotarAvulso(sugestaoExata?.name || skinBusca, sugestaoExata?.image);
  };

  const totaisAvulsos = useMemo(() => {
    const itensParaSomar = itensAvulsos.filter(item => itensAvulsosSelecionados.has(item.id));
    const totalCNYComTaxa = itensParaSomar.reduce((acc, item) => acc + ((item.youpinCNYComTaxa || 0) * item.amount), 0);
    const taxaCnyBrl = itensParaSomar[0]?.cnyBrl || 0; 
    const custoTotalRepasse = totalCNYComTaxa * taxaCnyBrl;
    const valorClienteRepasse = totalCNYComTaxa * parseFloat(taxaRepasse || "0");
    const lucroRepasse = valorClienteRepasse - custoTotalRepasse;
    return { totalCNYComTaxa, taxaCnyBrl, custoTotalRepasse, valorClienteRepasse, lucroRepasse };
  }, [itensAvulsos, itensAvulsosSelecionados, taxaRepasse]);

  return (
    <main className="min-h-screen bg-[#050505] pb-20 text-white">
      <header className="border-b border-white/5 bg-[#080809]/50 backdrop-blur-md px-8 py-20">
        <div className="max-w-360 mx-auto text-center md:text-left flex flex-col md:flex-row justify-between items-end gap-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Cotador Profissional</h1>
            <p className="text-zinc-500 text-lg font-medium">Análise de inventário em tempo real com precisão de mercado.</p>
          </div>
          <div className="flex bg-white/2 border border-white/5 p-1.5 rounded-2xl">
            <button onClick={() => { setAbaAtiva('tradelink'); setErro(null); }} className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${abaAtiva === 'tradelink' ? 'bg-white text-black shadow-xl' : 'text-zinc-500 hover:text-white'}`}>Trade Link</button>
            <button onClick={() => { setAbaAtiva('avulso'); setErro(null); }} className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${abaAtiva === 'avulso' ? 'bg-white text-black shadow-xl' : 'text-zinc-500 hover:text-white'}`}>Item Avulso</button>
          </div>
        </div>
      </header>

      <div className="px-8 py-16 max-w-360 mx-auto space-y-12">
        {abaAtiva === 'tradelink' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <div className="bg-white/2 border border-white/5 p-10 rounded-4xl max-w-3xl mx-auto">
              <form onSubmit={handleCotarInventario} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] ml-1">Trade Link</label>
                  <div className="relative group">
                    <LinkIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-purple-500" size={20} />
                    <input type="text" value={tradeLink} onChange={(e) => setTradeLink(e.target.value)} placeholder="https://steamcommunity.com/tradeoffer/..." className="w-full bg-black/40 border border-white/8 pl-14 pr-6 py-5 rounded-2xl text-sm outline-none focus:border-purple-500/30" />
                  </div>
                </div>
                <button disabled={loading || !tradeLink} className="w-full bg-white text-black font-bold py-5 rounded-2xl shadow-xl hover:bg-zinc-200 transition-all text-xs uppercase tracking-widest flex justify-center gap-4">
                  {loading ? <RefreshCw className="animate-spin" size={18} /> : 'Cotar Inventário'}
                </button>
              </form>
              {erro && <div className="mt-6 flex items-center gap-3 text-red-400 bg-red-400/5 p-4 rounded-xl text-xs"><AlertCircle size={16} /> {erro}</div>}
            </div>

            {resultadoInventario && (
              <div className="space-y-8 animate-in fade-in duration-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/2 border border-white/5 p-8 rounded-4xl">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Total BUFF</div>
                    <div className="text-3xl font-bold">R$ {totalBuff.toFixed(2)}</div>
                  </div>
                  <div className="bg-white/2 border border-white/5 p-8 rounded-4xl">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Total YOUPIN</div>
                    <div className="text-3xl font-bold">R$ {totalYoupin.toFixed(2)}</div>
                  </div>
                  <div className="bg-purple-500/5 border border-purple-500/20 p-8 rounded-4xl">
                    <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2">Média de Mercado</div>
                    <div className="text-3xl font-bold text-purple-400">R$ {totalMedio.toFixed(2)}</div>
                  </div>
                </div>

                <div className="bg-white/2 border border-white/5 p-6 rounded-4xl flex flex-col xl:flex-row items-center justify-between gap-6">
                  <div className="flex flex-wrap gap-4 items-center w-full xl:w-auto">
                    <div className="flex items-center gap-2 bg-black/40 border border-white/5 px-4 py-3 rounded-xl">
                      <Filter size={16} className="text-zinc-500" />
                      <select className="bg-transparent text-sm font-medium text-white outline-none cursor-pointer" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                        <option value="todos" className="bg-black">Todas as Skins</option>
                        <option value="faca" className="bg-black">Facas</option>
                        <option value="luva" className="bg-black">Luvas</option>
                        <option value="arma" className="bg-black">Apenas Armas</option>
                        <option value="caixa" className="bg-black">Caixas / Cápsulas</option>
                        <option value="adesivo" className="bg-black">Adesivos</option>
                      </select>
                    </div>
                    <button onClick={() => { setModoSelecao(!modoSelecao); setItensSelecionados(new Set()); }} className={`flex items-center gap-3 px-6 py-3 rounded-xl text-xs font-bold uppercase transition-all ${modoSelecao ? 'bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'bg-white/5 text-zinc-400'}`}>
                      {modoSelecao ? <CheckSquare size={16} /> : <Square size={16} />} {modoSelecao ? 'Desativar Seleção' : 'Selecionar Itens'}
                    </button>
                    
                    {modoSelecao && itensSelecionados.size > 0 && (
                      <div className="flex flex-col md:flex-row items-center gap-3 bg-black/50 px-4 py-2.5 rounded-xl border border-white/10">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">Desconto (%)</span>
                        <input type="number" className="bg-transparent w-16 outline-none text-green-400 font-bold text-center" value={descontoOferta} onChange={(e) => setDescontoOferta(e.target.value)} />
                        <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest hidden md:block border-l border-white/10 pl-3">Aplicado sobre o Total YouPin</span>
                      </div>
                    )}
                  </div>
                  
                  {modoSelecao && itensSelecionados.size > 0 && (
                    <div className="flex flex-wrap items-center gap-6 w-full xl:w-auto justify-end">
                      <div className="text-right">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold">Oferta Final</div>
                        <div className="text-xl font-bold text-green-400">R$ {valorOferta.toFixed(2)}</div>
                      </div>
                      
                      <div className="bg-purple-500/10 border border-purple-500/30 px-4 py-2 rounded-xl text-right">
                        <div className="text-[10px] text-purple-300 uppercase font-bold">Seu Lucro Líquido</div>
                        <div className="text-lg font-bold text-purple-400 mb-1">R$ {lucroRealizado.toFixed(2)}</div>
                      </div>

                      <button onClick={() => setModalImagemAberto(true)} className="bg-green-500 hover:bg-green-400 text-black px-6 py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2">
                        <Camera size={16} /> Gerar Oferta
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {itensFiltrados.map((item, idx) => {
                    const isSelected = itensSelecionados.has(item.id);
                    const proxyImageUrl = item.image ? `/api/cotar/imagens?url=${encodeURIComponent(item.image)}` : '';

                    return (
                      <div key={idx} onClick={() => { if (!modoSelecao) return; setItensSelecionados(prev => { const next = new Set(prev); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; }); }} className={`bg-white/2 border rounded-4xl overflow-hidden transition-all flex flex-col ${modoSelecao ? 'cursor-pointer hover:border-purple-500/50' : 'group'} ${isSelected ? 'border-purple-500 ring-1 ring-purple-500 bg-purple-500/5' : 'border-white/5'}`}>
                        <div className="aspect-square p-14 relative flex justify-center items-center">
                          {modoSelecao && <div className="absolute top-4 left-4 z-10 bg-black/50 rounded-lg p-1">{isSelected ? <CheckSquare size={20} className="text-purple-500" /> : <Square size={20} className="text-zinc-600" />}</div>}
                          
                          <div className="absolute top-4 right-4 flex flex-col gap-2 items-end z-10">
                            {item.wear && <span className="bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-[9px] font-bold text-zinc-300 uppercase shadow-xl border border-white/5">{item.wear}</span>}
                            {item.isStatTrak && <span className="bg-orange-500/20 backdrop-blur-sm text-orange-400 px-2 py-1 rounded text-[9px] font-bold uppercase border border-orange-500/30">StatTrak™</span>}
                            {item.isSouvenir && <span className="bg-yellow-500/20 backdrop-blur-sm text-yellow-400 px-2 py-1 rounded text-[9px] font-bold uppercase border border-yellow-500/30">Souvenir</span>}
                          </div>

                          {proxyImageUrl ? (
                            <img src={`${proxyImageUrl}&v=${new Date().getTime()}`} crossOrigin="anonymous" loading="lazy" className="w-full h-full object-contain drop-shadow-2xl z-0" alt={item.cleanName} />
                          ) : (
                            <Box size={48} className="text-zinc-800" />
                          )}
                          
                          {item.amount > 1 && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full border border-white/10 text-[10px] font-bold text-white">x{item.amount}</div>}
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                          
                          <h4 className="text-sm font-bold truncate text-white" title={item.cleanName}>{item.cleanName}</h4>
                          
                          <div className="space-y-3 pt-4 border-t border-white/5">
                            <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">BUFF</span>
                              <span className={`font-bold text-lg ${parseFloat(item.buffBRL) > 0 ? 'text-purple-400' : 'text-zinc-700'}`}>{parseFloat(item.buffBRL) > 0 ? `R$ ${item.buffBRL}` : 'Sem preço'}</span>
                            </div>
                            <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">YOUPIN</span>
                              <span className={`font-bold text-lg ${parseFloat(item.youpinBRL) > 0 ? 'text-blue-400' : 'text-zinc-700'}`}>{parseFloat(item.youpinBRL) > 0 ? `R$ ${item.youpinBRL}` : 'Sem preço'}</span>
                            </div>
                          </div>

                          {/* 🔥 ÁREA DE DEBUG VISUAL EXTREMO (Apenas na tela principal) */}
                          <div className="bg-black/80 border border-yellow-500/30 p-3 rounded-xl mt-4">
                            <div className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest mb-2 border-b border-yellow-500/20 pb-1">
                              ⚙️ Debug de Atributos
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                              <div className="flex flex-col">
                                <span className="text-zinc-500">Float:</span>
                                <span className={item.float !== null ? "text-green-400" : "text-red-400"}>
                                  {item.float !== null ? item.float.toFixed(6) : "N/A"}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-zinc-500">Pattern:</span>
                                <span className={item.pattern !== null ? "text-green-400" : "text-red-400"}>
                                  {item.pattern !== null ? item.pattern : "N/A"}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-zinc-500">Phase:</span>
                                <span className={item.phase !== null ? "text-green-400" : "text-red-400"}>
                                  {item.phase !== null ? item.phase : "N/A"}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-zinc-500">Fade %:</span>
                                <span className={item.fade !== null ? "text-green-400" : "text-red-400"}>
                                  {item.fade !== null ? `${item.fade}%` : "N/A"}
                                </span>
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {abaAtiva === 'avulso' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <div className="bg-white/2 border border-white/5 p-10 rounded-4xl max-w-3xl mx-auto">
              <form onSubmit={handleCotarAvulsoSubmit} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] ml-1">Buscar Item (Inglês ou Português)</label>
                  <div className="relative">
                    <div className="relative group">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-purple-500 transition-colors z-10" size={20} />
                      <input ref={inputRef} type="text" value={skinBusca} onChange={handleInputChange} onKeyDown={handleKeyDown} onFocus={() => skinBusca.length >= 2 && setDropdownAberto(true)} placeholder="Ex: Faca Safira FN, AK Asiimov FT, M4A1s..." className="w-full bg-black/40 border border-white/8 pl-14 pr-12 py-5 rounded-2xl text-sm text-white outline-none focus:border-purple-500/30 transition-all placeholder:text-zinc-800" autoComplete="off" />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {loadingSugestoes && <RefreshCw size={16} className="animate-spin text-zinc-600" />}
                        {skinBusca && !loadingSugestoes && <button type="button" onClick={() => { setSkinBusca(''); setDropdownAberto(false); setSugestoes([]); }} className="text-zinc-600 hover:text-white transition-colors"><X size={16} /></button>}
                      </div>
                    </div>
                    {dropdownAberto && (
                      <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-2 bg-[#0d0d0e] border border-white/8 rounded-2xl overflow-hidden z-50 shadow-2xl max-h-100 overflow-y-auto">
                        {loadingSugestoes && <div className="flex items-center gap-3 px-5 py-4"><RefreshCw size={14} className="animate-spin text-zinc-600" /><span className="text-xs text-zinc-600 font-bold uppercase tracking-widest">Buscando...</span></div>}
                        {!loadingSugestoes && sugestoes.length > 0 && (
                          sugestoes.map((s, idx) => {
                            const proxySugImage = s.image ? `/api/cotar/imagens?url=${encodeURIComponent(s.image)}` : '';
                            return (
                              <button key={idx} type="button" onClick={() => { setSkinBusca(''); setDropdownAberto(false); setSugestoes([]); cotarAvulso(s.name, s.image); }} className={`w-full flex items-center gap-4 px-5 py-3 text-left transition-all border-l-2 ${sugestaoSelecionada === idx ? 'bg-purple-500/10 border-purple-500' : 'hover:bg-white/3 border-transparent'}`}>
                                <div className="w-12 h-12 shrink-0 bg-white/3 rounded-xl overflow-hidden border border-white/5 flex items-center justify-center p-1">
                                  {proxySugImage ? <img src={proxySugImage} crossOrigin="anonymous" alt={s.name} loading="lazy" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <Box size={20} className="text-zinc-700" />}
                                </div>
                                <span className="text-sm text-zinc-300 truncate font-medium">{s.name}</span>
                              </button>
                            );
                          })
                        )}
                        {!loadingSugestoes && sugestoes.length === 0 && skinBusca.length >= 2 && (
                          <div className="px-5 py-6 text-center"><p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">Nenhuma skin encontrada</p></div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button disabled={loading || !skinBusca} className="w-full bg-white text-black font-bold py-5 rounded-2xl shadow-xl hover:bg-zinc-200 transition-all text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4">
                  {loading ? <RefreshCw className="animate-spin" size={18} /> : 'Adicionar à Cotação'}
                </button>
              </form>
              {erro && <div className="mt-6 flex items-center gap-3 text-red-400 bg-red-400/5 border border-red-400/10 p-4 rounded-xl text-xs"><AlertCircle size={16} /> {erro}</div>}
            </div>

            {itensAvulsos.length > 0 && (
              <div className="animate-in fade-in zoom-in-95 duration-500 space-y-12">
                <div className="bg-linear-to-br from-purple-500/10 to-blue-500/5 border border-purple-500/20 p-8 md:p-10 rounded-4xl">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center border border-purple-500/30">
                        <Calculator size={24} className="text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">Repasse YouPin</h3>
                        <p className="text-xs text-zinc-400">Adiciona os 1% e calcula o lucro pela sua taxa.</p>
                      </div>
                    </div>
                    <div className="bg-black/50 border border-white/10 px-5 py-4 rounded-2xl flex items-center gap-4 w-full md:w-auto">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Sua Taxa (R$)</span>
                      <input type="number" step="0.01" value={taxaRepasse} onChange={(e) => setTaxaRepasse(e.target.value)} className="bg-transparent text-white font-bold text-xl outline-none w-20 text-right border-b border-white/20 focus:border-purple-500 transition-colors" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-black/40 border border-white/5 p-6 rounded-4xl">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Total Selecionado (+1%)</div>
                      <div className="text-2xl font-bold text-white">¥ {totaisAvulsos.totalCNYComTaxa.toFixed(2)}</div>
                    </div>
                    <div className="bg-black/40 border border-white/5 p-6 rounded-4xl">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex justify-between"><span>Custo Real</span><span className="text-red-400/50">x{totaisAvulsos.taxaCnyBrl.toFixed(4)}</span></div>
                      <div className="text-2xl font-bold text-red-400">R$ {totaisAvulsos.custoTotalRepasse.toFixed(2)}</div>
                    </div>
                    <div className="bg-black/40 border border-white/5 p-6 rounded-4xl">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex justify-between"><span>Valor Cliente</span><span className="text-blue-400/50">x{taxaRepasse}</span></div>
                      <div className="text-2xl font-bold text-blue-400">R$ {totaisAvulsos.valorClienteRepasse.toFixed(2)}</div>
                    </div>
                    <div className="bg-purple-500/10 border border-purple-500/30 p-6 rounded-4xl">
                      <div className="text-[10px] font-bold text-purple-300 uppercase tracking-widest mb-2">Lucro Líquido</div>
                      <div className="text-2xl font-bold text-purple-400">R$ {totaisAvulsos.lucroRepasse.toFixed(2)}</div>
                    </div>
                  </div>

                  <button
                    onClick={handleCopiarCotacao}
                    disabled={itensAvulsosSelecionados.size === 0}
                    className={`mt-8 w-full py-5 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                      cotacaoCopiada
                        ? 'bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                        : 'bg-white text-black shadow-xl hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    {cotacaoCopiada ? <CheckSquare size={18} /> : <Copy size={18} />}
                    {cotacaoCopiada ? 'Cotação Copiada para o Clipboard!' : 'Enviar Cotação para o Cliente'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {itensAvulsos.map((item, idx) => {
                    const custoItem = item.youpinCNYComTaxa * totaisAvulsos.taxaCnyBrl;
                    const vendaItem = item.youpinCNYComTaxa * parseFloat(taxaRepasse || "0");
                    const isSelected = itensAvulsosSelecionados.has(item.id);
                    const proxyAvulsoImage = item.image ? `/api/cotar/imagens?url=${encodeURIComponent(item.image)}` : '';

                    return (
                      <div key={item.id} onClick={() => toggleSelecaoAvulso(item.id)} className={`bg-white/2 border rounded-4xl overflow-hidden transition-all cursor-pointer flex flex-col relative ${isSelected ? 'border-purple-500 ring-1 ring-purple-500 bg-purple-500/5' : 'border-white/5 hover:border-purple-500/50 hover:bg-white/4'}`}>
                        <button onClick={(e) => { e.stopPropagation(); setItensAvulsos(prev => prev.filter((_, i) => i !== idx)); setItensAvulsosSelecionados(prev => { const next = new Set(prev); next.delete(item.id); return next; }); }} className="absolute top-4 right-4 z-20 bg-red-500/10 text-red-400 p-2.5 rounded-xl hover:bg-red-500 hover:text-white transition-colors"><X size={16} strokeWidth={3} /></button>
                        
                        <div className="aspect-square p-14 relative flex items-center justify-center">
                          <div className="absolute top-4 left-4 z-10 bg-black/50 rounded-lg p-1">
                            {isSelected ? <CheckSquare size={20} className="text-purple-500" /> : <Square size={20} className="text-zinc-600" />}
                          </div>
                          
                          <div className="absolute top-4 right-4 flex flex-col gap-2 items-end z-10">
                            {item.wear && <span className="bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-[9px] font-bold text-zinc-300 uppercase shadow-xl border border-white/5">{item.wear}</span>}
                            {item.isStatTrak && <span className="bg-orange-500/20 backdrop-blur-sm text-orange-400 px-2 py-1 rounded text-[9px] font-bold uppercase border border-orange-500/30">StatTrak™</span>}
                            {item.isSouvenir && <span className="bg-yellow-500/20 backdrop-blur-sm text-yellow-400 px-2 py-1 rounded text-[9px] font-bold uppercase border border-yellow-500/30">Souvenir</span>}
                          </div>

                          {proxyAvulsoImage ? (
                            <img src={`${proxyAvulsoImage}&v=${new Date().getTime()}`} crossOrigin="anonymous" loading="lazy" className="w-full h-full object-contain hover:scale-125 transition-transform duration-500 drop-shadow-2xl" alt={item.cleanName} />
                          ) : (
                            <Box size={48} className="text-zinc-800" />
                          )}
                          
                          {item.amount > 1 && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full border border-white/10 text-[10px] font-bold">x{item.amount}</div>}
                        </div>
                        
                        <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                          <h4 className="text-sm font-bold truncate text-white" title={item.cleanName}>{item.cleanName}</h4>
                          <div className="space-y-3 pt-4 border-t border-white/5">
                            <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase">BUFF</span>
                              <span className="font-bold text-lg text-purple-400">R$ {item.buffBRL}</span>
                            </div>
                            <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase">YOUPIN (+1%)</span>
                              <span className="font-bold text-lg text-blue-400">¥ {item.youpinCNYComTaxa.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase pt-3 border-t border-white/2">
                              <span className="text-zinc-600">LUCRO</span>
                              <span className="text-green-400 font-bold bg-green-400/10 px-3 py-1.5 rounded-lg text-sm">R$ {(vendaItem - custoItem).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL DE GERAÇÃO DE IMAGEM ESPELHADO */}
      {modalImagemAberto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-[#050505] border border-white/10 rounded-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#080809]">
              <h2 className="text-xl font-bold text-white">Oferta Gerada</h2>
              <button onClick={() => setModalImagemAberto(false)} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 text-white"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 bg-[#050505]" ref={modalRef}>
              <div className="text-center mb-10">
                <h1 className="text-4xl font-bold tracking-tight text-white">Proposta de Compra</h1>
                <p className="text-sm mt-2 text-zinc-500">Inventário analisado profissionalmente em tempo real.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {itensParaModal.map((item, idx) => {
                  const isGem = item.phase && ['Ruby', 'Sapphire', 'Emerald', 'Black Pearl'].includes(item.phase);
                  const proxyModalImage = item.image ? `/api/cotar/imagens?url=${encodeURIComponent(item.image)}` : '';
                  
                  return (
                    <div key={idx} className="bg-white/2 border border-white/5 rounded-4xl overflow-hidden flex flex-col">
                      <div className="aspect-square p-14 relative flex justify-center items-center">
                        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end z-10">
                          {item.wear && <span className="bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-[9px] font-bold text-zinc-300 uppercase shadow-xl border border-white/5">{item.wear}</span>}
                          {item.isStatTrak && <span className="bg-orange-500/20 backdrop-blur-sm text-orange-400 px-2 py-1 rounded text-[9px] font-bold uppercase border border-orange-500/30">StatTrak™</span>}
                          {item.isSouvenir && <span className="bg-yellow-500/20 backdrop-blur-sm text-yellow-400 px-2 py-1 rounded text-[9px] font-bold uppercase border border-yellow-500/30">Souvenir</span>}
                        </div>
                        
                        {proxyModalImage && <img src={`${proxyModalImage}&v=${new Date().getTime()}`} crossOrigin="anonymous" alt={item.cleanName} className="w-full h-full object-contain drop-shadow-2xl z-0" />}
                        
                        {item.amount > 1 && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full border border-white/10 text-[10px] font-bold text-white">x{item.amount}</div>}
                      </div>
                      
                      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                        <h4 className="text-sm font-bold truncate text-white" title={item.cleanName}>{item.cleanName}</h4>
                        
                        {(item.float != null || item.pattern != null || item.phase != null || item.fade != null) && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {item.float != null && <span className="text-[9px] bg-white/5 border border-white/10 text-zinc-400 px-2 py-0.5 rounded uppercase font-bold">Float: {item.float.toFixed(4)}</span>}
                            {item.pattern != null && <span className="text-[9px] bg-white/5 border border-white/10 text-zinc-400 px-2 py-0.5 rounded uppercase font-bold">Pattern: {item.pattern}</span>}
                            {item.phase != null && <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold border ${isGem ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{item.phase}</span>}
                            {item.fade != null && <span className="text-[9px] bg-pink-500/10 border border-pink-500/20 text-pink-400 px-2 py-0.5 rounded uppercase font-bold">Fade {item.fade}%</span>}
                          </div>
                        )}
                        
                        <div className="space-y-3 pt-4 border-t border-white/5">
                          <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">BUFF</span>
                            <span className="font-bold text-lg text-purple-400">R$ {item.buffBRL}</span>
                          </div>
                          <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">YOUPIN</span>
                            <span className="font-bold text-lg text-blue-400">R$ {item.youpinBRL}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-purple-500/5 border border-purple-500/20 rounded-4xl p-8 flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Valor Real (YouPin)</div>
                  <div className="text-2xl font-medium text-zinc-500 line-through">R$ {totalYoupin.toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-green-400 uppercase tracking-widest mb-1">Oferta Final</div>
                  <div className="text-5xl font-bold text-green-400">R$ {valorOferta.toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/5 bg-[#080809]">
              <button onClick={exportarImagem} className="w-full bg-white text-black py-4 rounded-xl font-bold uppercase tracking-widest text-xs flex justify-center items-center gap-3 hover:bg-zinc-200 transition-colors">
                <Download size={18} /> Baixar Imagem da Oferta
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}