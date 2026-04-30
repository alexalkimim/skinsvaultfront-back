"use client"

import { useState, useRef, useCallback, useMemo } from 'react';
import {
  Search, RefreshCw, X, CheckSquare, Plus,
  TrendingUp, TrendingDown, DollarSign, Calendar, CreditCard,
  MessageSquare, Edit, CheckCircle, Package, Folder, 
  ChevronDown, ChevronRight, Filter, Trash2, Layers, FolderX
} from 'lucide-react';

interface Sugestao { name: string; image: string | null; }
type ItemStatus = 'Disponível' | 'Reservada' | 'Vendida' | 'Vendida RMB';

interface SkinEntrada {
  id: string;
  name: string;
  image: string | null;
  type: string;
  float: string;
  pattern: string;
  basePrice: number;
  discount: number;
  pricePaid: number;
  quantity: number;
  date: string;
  paymentMethod: string;
  comment: string;
  status: ItemStatus;
  salePrice: number; // Para venda BR
  salePriceRMB?: number; // NOVO: Para venda RMB
  salePlatformRMB?: string; // NOVO: Plataforma RMB
  folder: string | null;
}

interface FormRow {
  id: string;
  skinBusca: string;
  sugestoes: Sugestao[];
  dropdownAberto: boolean;
  loading: boolean;
  sugestaoSelecionada: Sugestao | null;
  basePrice: string;
  discount: string;
  pricePaid: string;
  quantity: string;
  floatVal: string;
  patternVal: string;
  comment: string;
  date: string;
  paymentMethod: string;
}

export default function RegistrarEntradasPage() {
  const [globalDate, setGlobalDate] = useState(new Date().toISOString().split('T')[0]);
  const [globalPayment, setGlobalPayment] = useState('PIX');
  const [globalComment, setGlobalComment] = useState('');
  
  const [agruparEmPasta, setAgruparEmPasta] = useState(false);
  const [nomePastaGlobal, setNomePastaGlobal] = useState('');

  const [formRows, setFormRows] = useState<FormRow[]>(() => [{
    id: Date.now().toString(), skinBusca: '', sugestoes: [], dropdownAberto: false,
    loading: false, sugestaoSelecionada: null, basePrice: '', discount: '', pricePaid: '', quantity: '1',
    floatVal: '', patternVal: '', comment: '', date: '', paymentMethod: ''
  }]);

  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [inventory, setInventory] = useState<SkinEntrada[]>([]);
  const [pastasExpandidas, setPastasExpandidas] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [filtroData, setFiltroData] = useState('Todos');
  const [filtroTipo, setFiltroTipo] = useState('Todos');

  const [itemEditando, setItemEditando] = useState<SkinEntrada | null>(null);
  const [itemVendendo, setItemVendendo] = useState<SkinEntrada | null>(null);
  const [valorVendaInput, setValorVendaInput] = useState('');

  // NOVOS ESTADOS PARA VENDA RMB
  const [itemVendendoRMB, setItemVendendoRMB] = useState<SkinEntrada | null>(null);
  const [valorRMBInput, setValorRMBInput] = useState('');
  const [plataformaRMBInput, setPlataformaRMBInput] = useState('Buff');

  const [folderModal, setFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [bulkEditModal, setBulkEditModal] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({ date: '', paymentMethod: '', status: '', comment: '' });

  const handleMath = (index: number, field: 'base' | 'discount' | 'paid', value: string) => {
    const newRows = [...formRows];
    const row = newRows[index];
    
    if (field === 'base') row.basePrice = value;
    else if (field === 'discount') row.discount = value;
    else if (field === 'paid') row.pricePaid = value;

    const base = parseFloat(row.basePrice) || 0;
    const desc = parseFloat(row.discount) || 0;
    const paid = parseFloat(row.pricePaid) || 0;

    if (field === 'base') {
        if (row.discount !== '') row.pricePaid = (base * (1 - desc / 100)).toFixed(2);
        else if (row.pricePaid !== '') row.discount = base > 0 ? ((1 - paid / base) * 100).toFixed(2) : '';
    } else if (field === 'discount') {
        if (row.basePrice !== '') row.pricePaid = (base * (1 - desc / 100)).toFixed(2);
    } else if (field === 'paid') {
        if (row.basePrice !== '') row.discount = base > 0 ? ((1 - paid / base) * 100).toFixed(2) : '';
    }

    setFormRows(newRows);
  };

  const buscarSugestoes = useCallback((index: number, valor: string) => {
    const rowId = formRows[index].id;
    if (debounceRefs.current[rowId]) clearTimeout(debounceRefs.current[rowId]);
    
    if (valor.length < 2) {
      const newRows = [...formRows];
      newRows[index].sugestoes = [];
      newRows[index].dropdownAberto = false;
      setFormRows(newRows);
      return;
    }

    const newRows = [...formRows];
    newRows[index].loading = true;
    newRows[index].dropdownAberto = true;
    setFormRows(newRows);

    debounceRefs.current[rowId] = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cotar/sugestoes?q=${encodeURIComponent(valor)}`);
        const data: Sugestao[] = await res.json();
        setFormRows(prev => {
            const updated = [...prev];
            updated[index].sugestoes = data;
            updated[index].loading = false;
            return updated;
        });
      } catch {
        setFormRows(prev => {
            const updated = [...prev];
            updated[index].sugestoes = [];
            updated[index].loading = false;
            return updated;
        });
      }
    }, 200);
  }, [formRows]);

  const handleInputChange = (index: number, val: string) => {
    const newRows = [...formRows];
    newRows[index].skinBusca = val;
    newRows[index].sugestaoSelecionada = null;
    setFormRows(newRows);
    buscarSugestoes(index, val);
  };

  const selecionarSugestao = (index: number, sug: Sugestao) => {
    const newRows = [...formRows];
    newRows[index].skinBusca = sug.name;
    newRows[index].sugestaoSelecionada = sug;
    newRows[index].dropdownAberto = false;
    setFormRows(newRows);
  };

  const detectType = (name: string) => {
    const l = name.toLowerCase();
    if (l.includes('knife') || l.includes('karambit') || l.includes('bayonet') || l.includes('butterfly') || l.includes('talon') || l.includes('m9')) return 'Faca';
    if (l.includes('gloves') || l.includes('hand wraps')) return 'Luva';
    if (l.includes('agent') || l.includes('agente')) return 'Agente';
    if (l.includes('sticker') || l.includes('patch')) return 'Adesivo';
    if (l.includes('case') || l.includes('capsule')) return 'Caixa';
    return 'Arma';
  };

  const adicionarMultiplos = () => {
    const temLinhaInvalida = formRows.some(r => r.skinBusca.trim() === '' || isNaN(parseFloat(r.pricePaid)) || parseFloat(r.pricePaid) < 0);

    if (temLinhaInvalida) {
        return alert("❌ Erro: Preencha o nome da skin e o valor pago em TODAS as linhas antes de salvar! (Se não for usar uma linha, clique no 'X' vermelho para removê-la).");
    }

    const folderDestino = (agruparEmPasta && nomePastaGlobal.trim() !== '') ? nomePastaGlobal.trim() : null;

    const novosItens: SkinEntrada[] = formRows.map(r => ({
      id: Math.random().toString(36).substring(2, 9),
      name: r.sugestaoSelecionada?.name || r.skinBusca,
      image: r.sugestaoSelecionada?.image || `https://steamcommunity-a.akamaihd.net/economy/image/class/730/${r.skinBusca.replace(/[^a-zA-Z0-9]/g, "")}/200fx200f`,
      type: detectType(r.sugestaoSelecionada?.name || r.skinBusca),
      float: r.floatVal || 'N/A',
      pattern: r.patternVal || 'N/A',
      basePrice: parseFloat(r.basePrice) || 0,
      discount: parseFloat(r.discount) || 0,
      pricePaid: parseFloat(r.pricePaid) || 0,
      quantity: parseInt(r.quantity) || 1,
      date: r.date || globalDate,
      paymentMethod: r.paymentMethod || globalPayment,
      comment: r.comment || globalComment || 'Sem comentários',
      status: 'Disponível',
      salePrice: 0,
      folder: folderDestino
    }));

    setInventory([...novosItens, ...inventory]);
    
    if (folderDestino) setPastasExpandidas(prev => ({...prev, [folderDestino]: true}));

    setFormRows([{
        id: Date.now().toString(), skinBusca: '', sugestoes: [], dropdownAberto: false,
        loading: false, sugestaoSelecionada: null, basePrice: '', discount: '', pricePaid: '', quantity: '1',
        floatVal: '', patternVal: '', comment: '', date: '', paymentMethod: ''
    }]);
    setAgruparEmPasta(false);
    setNomePastaGlobal('');
  };

  const addNovaLinha = () => {
      setFormRows([...formRows, {
        id: Date.now().toString(), skinBusca: '', sugestoes: [], dropdownAberto: false,
        loading: false, sugestaoSelecionada: null, basePrice: '', discount: '', pricePaid: '', quantity: '1',
        floatVal: '', patternVal: '', comment: '', date: '', paymentMethod: ''
      }]);
  };
  const removerLinha = (index: number) => {
      if (formRows.length > 1) setFormRows(formRows.filter((_, i) => i !== index));
  };

  const filteredInventory = useMemo(() => {
    let filtered = inventory;
    if (filtroData !== 'Todos') {
        const hoje = new Date();
        filtered = filtered.filter(item => {
            const itemDate = new Date(item.date);
            const diffTime = Math.abs(hoje.getTime() - itemDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (filtroData === 'Hoje') return diffDays <= 1;
            if (filtroData === '7 Dias') return diffDays <= 7;
            if (filtroData === 'Este Mês') return itemDate.getMonth() === hoje.getMonth() && itemDate.getFullYear() === hoje.getFullYear();
            return true;
        });
    }
    if (filtroTipo !== 'Todos') filtered = filtered.filter(i => i.type === filtroTipo);
    return filtered;
  }, [inventory, filtroData, filtroTipo]);

  const looseItems = filteredInventory.filter(item => !item.folder);
  const folderGroups = useMemo(() => {
      const groups: Record<string, SkinEntrada[]> = {};
      filteredInventory.filter(item => item.folder).forEach(item => {
          if (!groups[item.folder!]) groups[item.folder!] = [];
          groups[item.folder!].push(item);
      });
      return groups;
  }, [filteredInventory]);

  const toggleFolder = (folder: string) => setPastasExpandidas(prev => ({ ...prev, [folder]: !prev[folder] }));
  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
      setSelectedIds(newSet);
  };
  const selectAll = (folderItems: SkinEntrada[]) => {
      const newSet = new Set(selectedIds);
      const allSelected = folderItems.every(i => newSet.has(i.id));
      folderItems.forEach(i => allSelected ? newSet.delete(i.id) : newSet.add(i.id));
      setSelectedIds(newSet);
  };

  const aplicarPastaEmMassa = () => {
      if (!newFolderName.trim()) return alert("Dê um nome à pasta!");
      setInventory(prev => prev.map(item => selectedIds.has(item.id) ? { ...item, folder: newFolderName } : item));
      setFolderModal(false);
      setNewFolderName('');
      setSelectedIds(new Set());
      setPastasExpandidas(prev => ({...prev, [newFolderName]: true}));
  };

  const aplicarEdicaoMultipla = () => {
      setInventory(prev => prev.map(item => {
          if (selectedIds.has(item.id)) {
              return {
                  ...item,
                  date: bulkEditData.date || item.date,
                  paymentMethod: bulkEditData.paymentMethod || item.paymentMethod,
                  status: bulkEditData.status ? (bulkEditData.status as ItemStatus) : item.status,
                  comment: bulkEditData.comment || item.comment,
              };
          }
          return item;
      }));
      setBulkEditModal(false);
      setBulkEditData({ date: '', paymentMethod: '', status: '', comment: '' });
      setSelectedIds(new Set());
  };

  const removerDaPasta = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setInventory(prev => prev.map(item => item.id === id ? { ...item, folder: null } : item));
  };

  // --- CONFIRMAÇÃO DE VENDAS ---
  const confirmarVenda = () => {
    if (!itemVendendo) return;
    if (!valorVendaInput || isNaN(parseFloat(valorVendaInput))) return alert("Digite um valor de venda válido!");

    setInventory(prev => prev.map(item => {
      if (item.id === itemVendendo.id) {
        return { ...item, status: 'Vendida', salePrice: parseFloat(valorVendaInput) };
      }
      return item;
    }));
    setItemVendendo(null);
    setValorVendaInput('');
  };

  const confirmarVendaRMB = () => {
    if (!itemVendendoRMB) return;
    if (!valorRMBInput || isNaN(parseFloat(valorRMBInput))) return alert("Digite um valor em YUAN válido!");

    setInventory(prev => prev.map(item => {
      if (item.id === itemVendendoRMB.id) {
        return { ...item, status: 'Vendida RMB', salePriceRMB: parseFloat(valorRMBInput), salePlatformRMB: plataformaRMBInput };
      }
      return item;
    }));
    setItemVendendoRMB(null);
    setValorRMBInput('');
    setPlataformaRMBInput('Buff');
  };

  const salvarEdicao = () => {
    if (!itemEditando) return;
    setInventory(prev => prev.map(item => item.id === itemEditando.id ? itemEditando : item));
    setItemEditando(null);
  };

  // Matemática
  const gastosTotais = inventory.reduce((acc, item) => acc + (item.pricePaid * item.quantity), 0);
  const vendasTotais = inventory.filter(i => i.status === 'Vendida').reduce((acc, item) => acc + (item.salePrice * item.quantity), 0);
  const custoDosVendidos = inventory.filter(i => i.status === 'Vendida').reduce((acc, item) => acc + (item.pricePaid * item.quantity), 0);
  const lucroLiquido = vendasTotais - custoDosVendidos;
  const margemLucro = custoDosVendidos > 0 ? (lucroLiquido / custoDosVendidos) * 100 : 0;
  const barraLucro = Math.min(Math.max(margemLucro, 0), 100); 

  const renderSkinCard = (item: SkinEntrada) => (
      <div key={item.id} className={`border rounded-2xl overflow-hidden transition-all ${selectedIds.has(item.id) ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'border-white/5 bg-white/[0.02]'}`}>
          <div className="bg-black/30 p-8 flex items-center justify-center relative aspect-video cursor-pointer" onClick={() => toggleSelection(item.id)}>
              <div className={`absolute top-4 left-4 w-5 h-5 rounded border flex items-center justify-center transition-colors z-10 ${selectedIds.has(item.id) ? 'bg-purple-500 border-purple-500' : 'border-white/20 bg-black/50'}`}>
                  {selectedIds.has(item.id) && <CheckSquare size={12} className="text-white"/>}
              </div>
              
              <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-10">
                  <div className={`backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border 
                      ${item.status === 'Disponível' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                      item.status === 'Reservada' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                      item.status === 'Vendida RMB' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      {item.status}
                  </div>
                  {item.quantity > 1 && (
                      <div className="bg-purple-500/20 border border-purple-500/30 text-purple-400 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest">
                          {item.quantity}x UND
                      </div>
                  )}
              </div>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              {item.image ? <img src={item.image} className="w-3/4 object-contain drop-shadow-2xl" alt={item.name}/> : <Package size={48} className="text-zinc-800"/>}
          </div>

          <div className="p-5 space-y-4 bg-[#0a0a0a]">
              <h3 className="font-bold text-white text-sm truncate" title={item.name}>{item.name}</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-black/40 p-2.5 rounded-lg border border-white/5">
                      <p className="text-zinc-600 font-bold mb-1">CUSTO UN.</p>
                      <p className="text-red-400 font-bold">R$ {item.pricePaid.toFixed(2)}</p>
                  </div>
                  <div className="bg-black/40 p-2.5 rounded-lg border border-white/5">
                      {item.status === 'Vendida RMB' ? (
                          <>
                            <p className="text-zinc-600 font-bold mb-1">RMB/YUAN</p>
                            <p className="text-blue-400 font-bold">¥ {item.salePriceRMB?.toFixed(2)}</p>
                          </>
                      ) : (
                          <>
                            <p className="text-zinc-600 font-bold mb-1">OFF</p>
                            <p className="text-yellow-400 font-bold">{item.discount > 0 ? `${item.discount}%` : '--'}</p>
                          </>
                      )}
                  </div>
              </div>

              <div className="mt-2 space-y-2">
                  {!item.status.includes('Vendida') && (
                      <div className="grid grid-cols-2 gap-2">
                          <button onClick={(e) => { e.stopPropagation(); setItemVendendo(item); }} className="col-span-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-widest py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                              <CheckCircle size={12}/> Vender BR
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setItemVendendoRMB(item); }} className="col-span-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                              <DollarSign size={12}/> Vender RMB
                          </button>
                      </div>
                  )}
                  {item.folder && (
                      <button onClick={(e) => removerDaPasta(item.id, e)} className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                          <FolderX size={12}/> Remover da Pasta
                      </button>
                  )}
              </div>
          </div>
      </div>
  );

  return (
    <main className="min-h-screen bg-[#050505] pb-32 relative">
      
      <header className="border-b border-white/5 bg-[#080809]/50 backdrop-blur-md px-8 pt-16 pb-12">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-2">Registrar Entradas</h1>
          <p className="text-zinc-500 text-lg font-medium mb-10">Entradas avulsas, quantidades dinâmicas e pastas opcionais.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-black/40 border border-white/5 p-6 rounded-3xl relative overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-500/20 p-2.5 rounded-xl text-red-400"><TrendingDown size={20} /></div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Gastos Totais</h3>
              </div>
              <p className="text-3xl font-bold text-white">R$ {gastosTotais.toFixed(2)}</p>
            </div>

            <div className="bg-black/40 border border-white/5 p-6 rounded-3xl relative overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-500/20 p-2.5 rounded-xl text-blue-400"><DollarSign size={20} /></div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Vendas Totais</h3>
              </div>
              <p className="text-3xl font-bold text-white">R$ {vendasTotais.toFixed(2)}</p>
            </div>

            <div className="bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 p-6 rounded-3xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500/20 p-2.5 rounded-xl text-green-400"><TrendingUp size={20} /></div>
                  <h3 className="text-xs font-bold text-green-400/70 uppercase tracking-widest">Lucro Líquido</h3>
                </div>
                <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded-lg">
                   {margemLucro > 0 ? `+${margemLucro.toFixed(1)}%` : '0%'}
                </span>
              </div>
              <p className="text-3xl font-bold text-green-400 mb-4">R$ {lucroLiquido.toFixed(2)}</p>
              <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden">
                <div className="bg-green-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(34,197,94,0.5)]" style={{ width: `${barraLucro}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="px-8 py-12 max-w-7xl mx-auto space-y-12">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-10">
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
            <div className="flex items-center gap-3">
                <Layers className="text-purple-500" size={24} />
                <h2 className="text-xl font-bold text-white">Nova Entrada de Skins</h2>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Configurações Gerais (Aplicadas se o item estiver em branco)</h3>
            <div className="flex flex-wrap gap-4 bg-black/30 p-5 rounded-2xl border border-white/5">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-2"><Calendar size={12}/> Data (Geral)</label>
                    <input type="date" value={globalDate} onChange={(e) => setGlobalDate(e.target.value)} className="w-full bg-black/50 border border-white/10 px-4 py-3 rounded-xl text-sm text-white outline-none focus:border-purple-500" />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-2"><CreditCard size={12}/> Pagamento (Geral)</label>
                    <select value={globalPayment} onChange={(e) => setGlobalPayment(e.target.value)} className="w-full bg-black/50 border border-white/10 px-4 py-3 rounded-xl text-sm text-white outline-none appearance-none">
                        <option value="PIX">PIX</option><option value="Cartão">Cartão</option><option value="Cripto">Criptomoedas</option><option value="Saldo Buff">Saldo BUFF</option><option value="Trade">Trade (Troca)</option>
                    </select>
                </div>
                <div className="flex-[2] min-w-[250px]">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-2"><MessageSquare size={12}/> Comentário (Geral)</label>
                    <input type="text" value={globalComment} onChange={(e) => setGlobalComment(e.target.value)} placeholder="Aplicado a todos os itens..." className="w-full bg-black/50 border border-white/10 px-4 py-3 rounded-xl text-sm text-white outline-none focus:border-purple-500" />
                </div>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            {formRows.map((row, index) => (
                <div key={row.id} className="relative p-6 bg-black/20 border border-white/5 rounded-2xl">
                    {formRows.length > 1 && (
                        <button onClick={() => removerLinha(index)} className="absolute -top-3 -right-3 bg-red-500/20 text-red-400 p-2 rounded-full border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors"><X size={14}/></button>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-12 relative">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Nome da Skin</label>
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                                <input type="text" value={row.skinBusca} onChange={(e) => handleInputChange(index, e.target.value)} onFocus={() => row.skinBusca.length >= 2 && setFormRows(prev => { const n = [...prev]; n[index].dropdownAberto = true; return n; })} placeholder="Buscar..." className="w-full bg-black/40 border border-white/10 pl-10 pr-4 py-3 rounded-xl text-sm text-white outline-none focus:border-purple-500" />
                                {row.loading && <RefreshCw size={14} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-zinc-500" />}
                            </div>

                            {row.dropdownAberto && (
                                <div className="absolute top-full mt-2 left-0 right-0 bg-[#0d0d0e] border border-white/10 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                                    {row.sugestoes.map((s, idx) => (
                                        <button key={idx} onClick={() => selecionarSugestao(index, s)} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/10 border-b border-white/5 text-left">
                                            <div className="w-8 h-8 bg-black/50 rounded flex items-center justify-center p-1 border border-white/5">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                {s.image ? <img src={s.image} alt={s.name} className="object-contain" /> : <Package size={12}/>}
                                            </div>
                                            <span className="text-xs text-zinc-300 truncate">{s.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="md:col-span-3">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Valor no Dia (R$)</label>
                            <input type="number" value={row.basePrice} onChange={(e) => handleMath(index, 'base', e.target.value)} placeholder="Ex: 1000" className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-sm text-zinc-300 outline-none focus:border-blue-500" />
                        </div>
                        <div className="md:col-span-3">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Off Pago (%)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">%</span>
                                <input type="number" value={row.discount} onChange={(e) => handleMath(index, 'discount', e.target.value)} placeholder="Ex: 15" className="w-full bg-black/40 border border-yellow-500/30 pl-8 pr-4 py-3 rounded-xl text-sm text-yellow-400 font-bold outline-none focus:border-yellow-400" />
                            </div>
                        </div>
                        <div className="md:col-span-4">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Valor Pago Un. (R$)</label>
                            <input type="number" value={row.pricePaid} onChange={(e) => handleMath(index, 'paid', e.target.value)} placeholder="Ex: 850" className="w-full bg-black/40 border border-green-500/30 px-4 py-3 rounded-xl text-sm text-green-400 font-bold outline-none focus:border-green-400" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block text-purple-400">Quantidade</label>
                            <input type="number" min="1" value={row.quantity} onChange={(e) => { const n=[...formRows]; n[index].quantity=e.target.value; setFormRows(n); }} className="w-full bg-black/40 border border-purple-500/30 px-4 py-3 rounded-xl text-sm text-purple-400 font-bold outline-none focus:border-purple-400 text-center" />
                        </div>

                        <div className="md:col-span-3">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Float</label>
                            <input type="text" value={row.floatVal} onChange={(e) => { const n=[...formRows]; n[index].floatVal=e.target.value; setFormRows(n); }} placeholder="Opcional" className="w-full bg-black/40 border border-white/10 px-4 py-2.5 rounded-xl text-xs text-white outline-none" />
                        </div>
                        <div className="md:col-span-3">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Pattern</label>
                            <input type="text" value={row.patternVal} onChange={(e) => { const n=[...formRows]; n[index].patternVal=e.target.value; setFormRows(n); }} placeholder="Opcional" className="w-full bg-black/40 border border-white/10 px-4 py-2.5 rounded-xl text-xs text-white outline-none" />
                        </div>
                        <div className="md:col-span-3">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Data (Indiv.)</label>
                            <input type="date" value={row.date} onChange={(e) => { const n=[...formRows]; n[index].date=e.target.value; setFormRows(n); }} className="w-full bg-black/40 border border-white/10 px-4 py-2.5 rounded-xl text-xs text-white outline-none" />
                        </div>
                        <div className="md:col-span-3">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Pagamento (Indiv.)</label>
                            <select value={row.paymentMethod} onChange={(e) => { const n=[...formRows]; n[index].paymentMethod=e.target.value; setFormRows(n); }} className="w-full bg-black/40 border border-white/10 px-4 py-2.5 rounded-xl text-xs text-white outline-none appearance-none">
                                <option value="">Usar Geral</option><option value="PIX">PIX</option><option value="Cartão">Cartão</option><option value="Cripto">Criptomoedas</option><option value="Saldo Buff">Saldo BUFF</option><option value="Trade">Trade</option>
                            </select>
                        </div>
                        <div className="md:col-span-12">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Comentário Individual</label>
                            <input type="text" value={row.comment} onChange={(e) => { const n=[...formRows]; n[index].comment=e.target.value; setFormRows(n); }} placeholder="Substitui o comentário geral para esta skin..." className="w-full bg-black/40 border border-white/10 px-4 py-2.5 rounded-xl text-xs text-white outline-none" />
                        </div>
                    </div>
                </div>
            ))}
          </div>

          <div className="bg-black/30 p-5 rounded-2xl border border-white/5 mb-6">
            <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
                <input 
                    type="checkbox" 
                    checked={agruparEmPasta} 
                    onChange={(e) => setAgruparEmPasta(e.target.checked)} 
                    className="w-5 h-5 rounded border-white/10 bg-black/50 text-purple-500 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer" 
                />
                <span className="text-sm font-bold text-zinc-300 uppercase tracking-widest">
                    Salvar {formRows.length > 1 ? 'todos os itens' : 'a skin'} em uma pasta
                </span>
            </label>
            {agruparEmPasta && (
                <div className="mt-4 animate-in slide-in-from-top-2">
                    <input 
                        type="text" 
                        value={nomePastaGlobal} 
                        onChange={(e) => setNomePastaGlobal(e.target.value)} 
                        placeholder="Nome da pasta (Ex: Caixa Mensal)" 
                        className="w-full md:w-1/2 bg-black/40 border border-purple-500/50 px-4 py-3 rounded-xl text-sm text-white outline-none focus:border-purple-400 transition-colors" 
                    />
                </div>
            )}
          </div>

          <div className="flex gap-4">
            <button onClick={addNovaLinha} className="flex-1 border border-white/10 hover:bg-white/5 text-zinc-300 font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
                <Plus size={16} /> Adicionar mais uma skin
            </button>
            <button onClick={adicionarMultiplos} className="flex-[2] bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
                <CheckSquare size={16} /> {formRows.length > 1 ? 'Salvar Todos os Itens' : 'Salvar Skin'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-3"><CheckSquare size={20} className="text-zinc-500"/> Inventário Salvo</h2>
                
                <div className="flex gap-3 bg-white/5 p-2 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 px-3 text-zinc-400 border-r border-white/10"><Filter size={14}/></div>
                    <select value={filtroData} onChange={(e) => setFiltroData(e.target.value)} className="bg-transparent text-xs text-white outline-none cursor-pointer">
                        <option value="Todos">Todas as Datas</option><option value="Hoje">Hoje</option><option value="7 Dias">Últimos 7 Dias</option><option value="Este Mês">Este Mês</option>
                    </select>
                    <div className="w-px h-4 bg-white/10"></div>
                    <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="bg-transparent text-xs text-white outline-none cursor-pointer">
                        <option value="Todos">Todos os Tipos</option><option value="Faca">Faca</option><option value="Luva">Luva</option><option value="Arma">Arma</option><option value="Agente">Agente</option>
                    </select>
                </div>
            </div>

            {looseItems.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {looseItems.map(item => renderSkinCard(item))}
                </div>
            )}
            
            {Object.entries(folderGroups).map(([folderName, items]) => {
                const isExpanded = pastasExpandidas[folderName] !== false;
                const totalPasta = items.reduce((acc, i) => acc + (i.pricePaid * i.quantity), 0);

                return (
                    <div key={folderName} className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden mb-6">
                        <div onClick={() => toggleFolder(folderName)} className="flex items-center justify-between p-5 bg-black/40 cursor-pointer hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-4">
                                {isExpanded ? <ChevronDown size={18} className="text-zinc-500"/> : <ChevronRight size={18} className="text-zinc-500"/>}
                                <Folder size={18} className="text-purple-400"/>
                                <h3 className="font-bold text-white text-sm uppercase tracking-widest">{folderName} <span className="text-zinc-500 ml-2">({items.length})</span></h3>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-bold text-zinc-500">TOTAL: <span className="text-white">R$ {totalPasta.toFixed(2)}</span></span>
                                <button onClick={(e) => { e.stopPropagation(); selectAll(items); }} className="text-[10px] bg-white/10 px-3 py-1.5 rounded text-white hover:bg-white/20">SELECIONAR TUDO</button>
                            </div>
                        </div>
                        {isExpanded && (
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {items.map(item => renderSkinCard(item))}
                            </div>
                        )}
                    </div>
                );
            })}

            {inventory.length === 0 && (
                <div className="text-center py-20 bg-white/5 border border-white/5 rounded-3xl">
                    <Package size={48} className="mx-auto text-zinc-800 mb-4" />
                    <p className="text-zinc-500 font-bold uppercase tracking-widest">Nenhuma skin registrada ainda.</p>
                </div>
            )}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#111] border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-6 z-40 animate-in slide-in-from-bottom-10">
            <span className="text-white font-bold px-4">{selectedIds.size} itens</span>
            <div className="h-6 w-px bg-white/10"></div>
            <button onClick={() => setFolderModal(true)} className="flex items-center gap-2 text-xs font-bold text-zinc-300 hover:text-white uppercase tracking-widest bg-white/5 px-4 py-2 rounded-lg"><Folder size={14}/> Agrupar em Pasta</button>
            <button onClick={() => setBulkEditModal(true)} className="flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest bg-blue-500/10 px-4 py-2 rounded-lg"><Edit size={14}/> Edição Múltipla</button>
            <button onClick={() => { setInventory(prev => prev.filter(i => !selectedIds.has(i.id))); setSelectedIds(new Set()); }} className="flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 uppercase tracking-widest bg-red-500/10 px-4 py-2 rounded-lg"><Trash2 size={14}/> Excluir</button>
        </div>
      )}

      {folderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#0a0a0b] border border-white/10 rounded-3xl p-8 w-full max-w-sm">
            <h3 className="text-xl font-bold text-white mb-4">Nome da Pasta</h3>
            <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Ex: Skins do Jorge" className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-sm text-white outline-none mb-6" />
            <div className="flex gap-4">
                <button onClick={() => setFolderModal(false)} className="flex-1 py-3 text-zinc-400 hover:text-white">Cancelar</button>
                <button onClick={aplicarPastaEmMassa} className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-xl">Agrupar</button>
            </div>
          </div>
        </div>
      )}

      {bulkEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0a0a0b] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setBulkEditModal(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white"><X size={20} /></button>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3"><Edit className="text-blue-400"/> Edição Múltipla ({selectedIds.size} itens)</h3>
            
            <p className="text-xs text-zinc-500 mb-6">Deixe em branco os campos que não deseja alterar.</p>

            <div className="space-y-4 mb-8">
                <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Nova Data</label>
                    <input type="date" value={bulkEditData.date} onChange={(e) => setBulkEditData({...bulkEditData, date: e.target.value})} className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-sm text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Novo Pagamento</label>
                    <select value={bulkEditData.paymentMethod} onChange={(e) => setBulkEditData({...bulkEditData, paymentMethod: e.target.value})} className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-sm text-white outline-none appearance-none">
                        <option value="">Não alterar</option><option value="PIX">PIX</option><option value="Cartão">Cartão</option><option value="Cripto">Criptomoedas</option><option value="Saldo Buff">Saldo BUFF</option><option value="Trade">Trade</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Novo Status</label>
                    <select value={bulkEditData.status} onChange={(e) => setBulkEditData({...bulkEditData, status: e.target.value})} className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-sm text-white outline-none appearance-none">
                        <option value="">Não alterar</option><option value="Disponível">Disponível</option><option value="Reservada">Reservada</option><option value="Vendida">Vendida</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Novo Comentário</label>
                    <input type="text" value={bulkEditData.comment} onChange={(e) => setBulkEditData({...bulkEditData, comment: e.target.value})} placeholder="Aplicar a todos selecionados..." className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-sm text-white outline-none focus:border-blue-500" />
                </div>
            </div>

            <button onClick={aplicarEdicaoMultipla} className="w-full bg-blue-500 hover:bg-blue-400 text-black font-bold py-4 rounded-2xl transition-colors uppercase tracking-widest text-xs">
                Aplicar Alterações
            </button>
          </div>
        </div>
      )}

      {itemVendendo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0a0a0b] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setItemVendendo(null)} className="absolute top-6 right-6 text-zinc-500 hover:text-white"><X size={20} /></button>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3"><CheckCircle className="text-green-400"/> Vender Skin (BR)</h3>
            
            <div className="bg-black/50 border border-white/5 p-4 rounded-2xl mb-6">
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">Item a Vender</p>
                <p className="text-sm font-medium text-zinc-300 truncate">{itemVendendo.quantity}x {itemVendendo.name}</p>
                <div className="mt-3 flex justify-between items-center border-t border-white/5 pt-3">
                    <span className="text-xs text-zinc-500">Custo Total:</span>
                    <span className="text-red-400 font-bold">R$ {(itemVendendo.pricePaid * itemVendendo.quantity).toFixed(2)}</span>
                </div>
            </div>

            <div className="space-y-2 mb-8">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Valor da Venda Final (R$)</label>
                <input type="number" step="0.01" value={valorVendaInput} onChange={(e) => setValorVendaInput(e.target.value)} placeholder="0.00" className="w-full bg-black/40 border border-green-500/30 px-4 py-4 rounded-2xl text-lg text-white font-bold outline-none focus:border-green-400" />
            </div>

            <button onClick={confirmarVenda} className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-4 rounded-2xl transition-colors uppercase tracking-widest text-xs">
                Confirmar Venda
            </button>
          </div>
        </div>
      )}

      {/* NOVO MODAL: VENDER RMB */}
      {itemVendendoRMB && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0a0a0b] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setItemVendendoRMB(null)} className="absolute top-6 right-6 text-zinc-500 hover:text-white"><X size={20} /></button>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3"><DollarSign className="text-blue-400"/> Vender em RMB</h3>
            
            <div className="bg-black/50 border border-white/5 p-4 rounded-2xl mb-6">
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">Item a Vender</p>
                <p className="text-sm font-medium text-zinc-300 truncate">{itemVendendoRMB.quantity}x {itemVendendoRMB.name}</p>
                <div className="mt-3 flex justify-between items-center border-t border-white/5 pt-3">
                    <span className="text-xs text-zinc-500">Custo Total:</span>
                    <span className="text-red-400 font-bold">R$ {(itemVendendoRMB.pricePaid * itemVendendoRMB.quantity).toFixed(2)}</span>
                </div>
            </div>

            <div className="space-y-4 mb-8">
                <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 block mb-2">Plataforma</label>
                    <select value={plataformaRMBInput} onChange={(e) => setPlataformaRMBInput(e.target.value)} className="w-full bg-black/40 border border-white/10 px-4 py-4 rounded-2xl text-sm text-white outline-none appearance-none focus:border-blue-400">
                        <option value="Buff">Buff163</option>
                        <option value="Youpin">Youpin</option>
                        <option value="C5">C5Game</option>
                        <option value="Outros">Outros</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 block mb-2">Valor da Venda (YUAN / ¥)</label>
                    <input type="number" step="0.01" value={valorRMBInput} onChange={(e) => setValorRMBInput(e.target.value)} placeholder="0.00" className="w-full bg-black/40 border border-blue-500/30 px-4 py-4 rounded-2xl text-lg text-white font-bold outline-none focus:border-blue-400" />
                </div>
            </div>

            <button onClick={confirmarVendaRMB} className="w-full bg-blue-500 hover:bg-blue-400 text-black font-bold py-4 rounded-2xl transition-colors uppercase tracking-widest text-xs">
                Confirmar Venda em RMB
            </button>
          </div>
        </div>
      )}

    </main>
  );
}