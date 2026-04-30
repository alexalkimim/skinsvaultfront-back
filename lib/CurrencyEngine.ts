class CurrencyEngine {
  public cambio = {
    USD_BRL: 5.00,
    CNY_BRL: 0.74,
  };

  public perfis = {
    buff: {
      moedaNativa: 'CNY',
      taxaFixa: 0,
      spreadCambial: 0, 
      arredondamento: 'round',
      casas: 2,
      fatorCalibracao: 1.0 // Absolutamente neutro
    },
    youpin: {
      moedaNativa: 'CNY',
      taxaFixa: 0,
      spreadCambial: 0, 
      arredondamento: 'round',
      casas: 2,
      fatorCalibracao: 1.0 // Absolutamente neutro
    }
  };

  atualizarCambio(usdBrl: number, cnyBrl: number) {
    this.cambio.USD_BRL = usdBrl;
    this.cambio.CNY_BRL = cnyBrl;
  }

  aplicarArredondamento(valor: number, metodo: string, casas: number) {
    const multiplicador = Math.pow(10, casas);
    switch (metodo) {
      case 'floor': return Math.floor(valor * multiplicador) / multiplicador;
      case 'ceil':  return Math.ceil(valor * multiplicador) / multiplicador;
      case 'round': default: return Math.round(valor * multiplicador) / multiplicador;
    }
  }

  converterPreco(valor: number, moedaOrigem: string, site: 'buff' | 'youpin') {
    const perfil = this.perfis[site];
    
    // Tratamento direto via operador ternário
    const valorBaseBRL = moedaOrigem === 'USD' ? valor * this.cambio.USD_BRL
                       : moedaOrigem === 'CNY' ? valor * this.cambio.CNY_BRL
                       : valor;

    const valorFinal = valorBaseBRL * (1 + perfil.spreadCambial) * (1 + perfil.taxaFixa) * perfil.fatorCalibracao;
    return this.aplicarArredondamento(valorFinal, perfil.arredondamento, perfil.casas);
  }
}

export const engine = new CurrencyEngine();