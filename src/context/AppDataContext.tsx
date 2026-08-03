import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useAppData } from '../hooks/useAppData';
import { calcularProduto } from '../lib/calc';
import { buscarOverrides, removerOverride, removerTodosOverrides, salvarOverride } from '../lib/supabase';
import type { AppData, ProdutoCalculado } from '../types';

const PRECOS_STORAGE_KEY = 'cmv-dashboard-precos-editados';

function lerPrecosSalvos(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const salvo = window.localStorage.getItem(PRECOS_STORAGE_KEY);
    if (!salvo) return {};
    const parsed = JSON.parse(salvo) as Record<string, number>;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
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
  /** Define um preço de venda "em teste" para um produto, sincronizado no Supabase entre dispositivos. */
  editarPreco: (produto: string, preco: number) => void;
  /** Volta um único produto ao preço praticado original da planilha. */
  restaurarPreco: (produto: string) => void;
  /** Volta todos os produtos ao preço praticado original da planilha. */
  restaurarTodosPrecos: () => void;
  qtdPrecosEditados: number;
  /** true enquanto busca os preços editados salvos no Supabase, na primeira carga. */
  sincronizandoPrecos: boolean;
  /** Mensagem de erro de sincronização com o Supabase, se a última tentativa falhou (o app segue funcionando com o cache local). */
  erroSincronizacao: string | null;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: PropsWithChildren) {
  const { data, erro, carregando, importarArquivo, restaurarPadrao } = useAppData();
  const [loja, setLoja] = useState<string>('');
  const [precosEditados, setPrecosEditados] = useState<Record<string, number>>(lerPrecosSalvos);
  const [sincronizandoPrecos, setSincronizandoPrecos] = useState(true);
  const [erroSincronizacao, setErroSincronizacao] = useState<string | null>(null);

  // Cache local — garante que o dashboard funciona (com a última versão conhecida) mesmo offline.
  useEffect(() => {
    window.localStorage.setItem(PRECOS_STORAGE_KEY, JSON.stringify(precosEditados));
  }, [precosEditados]);

  const sincronizarComSupabase = useCallback(async () => {
    try {
      const remoto = await buscarOverrides('overrides_preco', 'preco');
      setPrecosEditados(remoto);
      setErroSincronizacao(null);
    } catch {
      setErroSincronizacao(
        'Não consegui buscar os preços mais recentes do Supabase — mostrando a última versão salva neste dispositivo.',
      );
    } finally {
      setSincronizandoPrecos(false);
    }
  }, []);

  // Busca os preços editados salvos por qualquer dispositivo ao abrir o app, e de novo sempre que a aba volta a ficar ativa.
  useEffect(() => {
    void sincronizarComSupabase();
    const aoFocar = () => void sincronizarComSupabase();
    window.addEventListener('focus', aoFocar);
    return () => window.removeEventListener('focus', aoFocar);
  }, [sincronizarComSupabase]);

  const lojaAtiva = loja || data?.config.lojaSelecionada || data?.rateio.lojas[0] || '';
  const custoFixoRateado = data?.rateio.rateadoPorLoja[lojaAtiva] ?? 0;

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

  const qtdPrecosEditados = produtosCalculados.filter((p) => p.editado).length;

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
    editarPreco,
    restaurarPreco,
    restaurarTodosPrecos,
    qtdPrecosEditados,
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
