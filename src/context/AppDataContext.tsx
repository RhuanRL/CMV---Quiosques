import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useAppData } from '../hooks/useAppData';
import { calcularProduto } from '../lib/calc';
import { buscarOverrides, removerOverride, removerTodosOverrides, salvarOverride } from '../lib/supabase';
import type { AppData, ProdutoCalculado, RateioData } from '../types';

const PRECOS_STORAGE_KEY = 'cmv-dashboard-precos-editados';
const CUSTOS_FIXOS_STORAGE_KEY = 'cmv-dashboard-custos-fixos-editados';

function lerMapaSalvo(chave: string): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const salvo = window.localStorage.getItem(chave);
    if (!salvo) return {};
    const parsed = JSON.parse(salvo) as Record<string, number>;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/** Chave composta usada pra guardar o override de um item de custo fixo — é por item E por loja. */
function chaveCustoFixo(item: string, loja: string): string {
  return `${item}::${loja}`;
}

interface AppDataContextValue {
  data: AppData | null;
  erro: string | null;
  carregando: boolean;
  importarArquivo: (file: File) => Promise<void>;
  restaurarPadrao: () => Promise<void>;
  loja: string;
  setLoja: (loja: string) => void;
  produtosCalculados: ProdutoCalculado[];
  custoFixoRateado: number;
  /** Rateio com os itens de custo fixo editados aplicados — total e custo rateado recalculados. */
  rateioEfetivo: RateioData | null;
  /** Define um preço de venda "em teste" para um produto, sincronizado no Supabase entre dispositivos. */
  editarPreco: (produto: string, preco: number) => void;
  /** Volta um único produto ao preço praticado original da planilha. */
  restaurarPreco: (produto: string) => void;
  /** Volta todos os produtos ao preço praticado original da planilha. */
  restaurarTodosPrecos: () => void;
  qtdPrecosEditados: number;
  /** Edita manualmente o valor de um item de custo fixo (ex.: Aluguel) numa loja específica. */
  editarCustoFixo: (item: string, loja: string, valor: number) => void;
  /** Volta um item de custo fixo ao valor original da planilha, numa loja específica. */
  restaurarCustoFixo: (item: string, loja: string) => void;
  /** Volta todos os itens de custo fixo aos valores originais da planilha. */
  restaurarTodosCustosFixos: () => void;
  qtdCustosFixosEditados: number;
  /** true enquanto busca os preços editados salvos no Supabase, na primeira carga. */
  sincronizandoPrecos: boolean;
  /** Mensagem de erro de sincronização com o Supabase, se a última tentativa falhou (o app segue funcionando com o cache local). */
  erroSincronizacao: string | null;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: PropsWithChildren) {
  const { data, erro, carregando, importarArquivo, restaurarPadrao } = useAppData();
  const [loja, setLoja] = useState<string>('');
  const [precosEditados, setPrecosEditados] = useState<Record<string, number>>(() => lerMapaSalvo(PRECOS_STORAGE_KEY));
  const [custosFixosEditados, setCustosFixosEditados] = useState<Record<string, number>>(() =>
    lerMapaSalvo(CUSTOS_FIXOS_STORAGE_KEY),
  );
  const [sincronizandoPrecos, setSincronizandoPrecos] = useState(true);
  const [erroSincronizacao, setErroSincronizacao] = useState<string | null>(null);

  // Cache local — garante que o dashboard funciona (com a última versão conhecida) mesmo offline.
  useEffect(() => {
    window.localStorage.setItem(PRECOS_STORAGE_KEY, JSON.stringify(precosEditados));
  }, [precosEditados]);
  useEffect(() => {
    window.localStorage.setItem(CUSTOS_FIXOS_STORAGE_KEY, JSON.stringify(custosFixosEditados));
  }, [custosFixosEditados]);

  const sincronizarComSupabase = useCallback(async () => {
    try {
      const [precos, custosFixos] = await Promise.all([
        buscarOverrides('overrides_preco', 'preco'),
        buscarOverrides('overrides_custo_fixo', 'valor'),
      ]);
      setPrecosEditados(precos);
      setCustosFixosEditados(custosFixos);
      setErroSincronizacao(null);
    } catch {
      setErroSincronizacao(
        'Não consegui buscar os valores mais recentes do Supabase — mostrando a última versão salva neste dispositivo.',
      );
    } finally {
      setSincronizandoPrecos(false);
    }
  }, []);

  // Busca os valores editados salvos por qualquer dispositivo ao abrir o app, e de novo sempre que a aba volta a ficar ativa.
  useEffect(() => {
    void sincronizarComSupabase();
    const aoFocar = () => void sincronizarComSupabase();
    window.addEventListener('focus', aoFocar);
    return () => window.removeEventListener('focus', aoFocar);
  }, [sincronizarComSupabase]);

  const lojaAtiva = loja || data?.config.lojaSelecionada || data?.rateio.lojas[0] || '';

  // Aplica os overrides de custo fixo sobre o rateio da planilha, recalculando total e custo rateado por loja.
  // Só recalcula (total = soma dos itens, rateado = total / volume) quando há pelo menos um item editado —
  // sem edições, usa os valores exatamente como vieram da planilha.
  const rateioEfetivo = useMemo<RateioData | null>(() => {
    if (!data) return null;
    const { rateio } = data;
    if (Object.keys(custosFixosEditados).length === 0) return rateio;

    const itens = rateio.itens.map((item) => {
      const porLoja: Record<string, number> = {};
      for (const l of rateio.lojas) {
        const override = custosFixosEditados[chaveCustoFixo(item.item, l)];
        porLoja[l] = override ?? item.porLoja[l] ?? 0;
      }
      return { ...item, porLoja };
    });

    const totalPorLoja: Record<string, number> = {};
    const rateadoPorLoja: Record<string, number> = {};
    for (const l of rateio.lojas) {
      totalPorLoja[l] = itens.reduce((soma, item) => soma + (item.porLoja[l] ?? 0), 0);
      const volume = rateio.volumePorLoja[l];
      rateadoPorLoja[l] = volume > 0 ? totalPorLoja[l] / volume : (rateio.rateadoPorLoja[l] ?? 0);
    }

    return { ...rateio, itens, totalPorLoja, rateadoPorLoja };
  }, [data, custosFixosEditados]);

  const custoFixoRateado = rateioEfetivo?.rateadoPorLoja[lojaAtiva] ?? 0;

  const produtosCalculados = useMemo(() => {
    if (!data) return [];
    return data.produtos.map((p) => {
      const precoOriginal = p.precoPraticado;
      const precoEditado = precosEditados[p.produto];
      const precoEfetivo = precoEditado ?? precoOriginal;
      const calculado = calcularProduto({ ...p, precoPraticado: precoEfetivo }, custoFixoRateado, data.config);
      return { ...calculado, precoOriginal, editado: precoEditado !== undefined && precoEditado !== precoOriginal };
    });
  }, [data, custoFixoRateado, precosEditados]);

  const editarPreco = (produto: string, preco: number) => {
    setPrecosEditados((atual) => ({ ...atual, [produto]: preco }));
    setErroSincronizacao(null);
    salvarOverride('overrides_preco', 'preco', produto, preco).catch(() =>
      setErroSincronizacao('Esse preço não foi salvo no Supabase (ficou só neste dispositivo por enquanto).'),
    );
  };

  const restaurarPreco = (produto: string) => {
    setPrecosEditados((atual) => {
      if (!(produto in atual)) return atual;
      const resto = { ...atual };
      delete resto[produto];
      return resto;
    });
    removerOverride('overrides_preco', produto).catch(() =>
      setErroSincronizacao('Não consegui desfazer esse preço no Supabase.'),
    );
  };

  const restaurarTodosPrecos = () => {
    setPrecosEditados({});
    removerTodosOverrides('overrides_preco').catch(() =>
      setErroSincronizacao('Não consegui limpar os preços editados no Supabase.'),
    );
  };

  const editarCustoFixo = (item: string, lojaAlvo: string, valor: number) => {
    const chave = chaveCustoFixo(item, lojaAlvo);
    setCustosFixosEditados((atual) => ({ ...atual, [chave]: valor }));
    setErroSincronizacao(null);
    salvarOverride('overrides_custo_fixo', 'valor', chave, valor).catch(() =>
      setErroSincronizacao('Esse custo fixo não foi salvo no Supabase (ficou só neste dispositivo por enquanto).'),
    );
  };

  const restaurarCustoFixo = (item: string, lojaAlvo: string) => {
    const chave = chaveCustoFixo(item, lojaAlvo);
    setCustosFixosEditados((atual) => {
      if (!(chave in atual)) return atual;
      const resto = { ...atual };
      delete resto[chave];
      return resto;
    });
    removerOverride('overrides_custo_fixo', chave).catch(() =>
      setErroSincronizacao('Não consegui desfazer esse custo fixo no Supabase.'),
    );
  };

  const restaurarTodosCustosFixos = () => {
    setCustosFixosEditados({});
    removerTodosOverrides('overrides_custo_fixo').catch(() =>
      setErroSincronizacao('Não consegui limpar os custos fixos editados no Supabase.'),
    );
  };

  const qtdPrecosEditados = produtosCalculados.filter((p) => p.editado).length;
  const qtdCustosFixosEditados = Object.keys(custosFixosEditados).length;

  const value: AppDataContextValue = {
    data,
    erro,
    carregando,
    importarArquivo,
    restaurarPadrao,
    loja: lojaAtiva,
    setLoja,
    produtosCalculados,
    custoFixoRateado,
    rateioEfetivo,
    editarPreco,
    restaurarPreco,
    restaurarTodosPrecos,
    qtdPrecosEditados,
    editarCustoFixo,
    restaurarCustoFixo,
    restaurarTodosCustosFixos,
    qtdCustosFixosEditados,
    sincronizandoPrecos,
    erroSincronizacao,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppDataContext(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppDataContext deve ser usado dentro de AppDataProvider');
  return ctx;
}
