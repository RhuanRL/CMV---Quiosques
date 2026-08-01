import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useAppData } from '../hooks/useAppData';
import { calcularProduto } from '../lib/calc';
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
  /** Define um preço de venda "em teste" para um produto, sem alterar a planilha original. */
  editarPreco: (produto: string, preco: number) => void;
  /** Volta um único produto ao preço praticado original da planilha. */
  restaurarPreco: (produto: string) => void;
  /** Volta todos os produtos ao preço praticado original da planilha. */
  restaurarTodosPrecos: () => void;
  qtdPrecosEditados: number;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: PropsWithChildren) {
  const { data, erro, carregando, importarArquivo, restaurarPadrao } = useAppData();
  const [loja, setLoja] = useState<string>('');
  const [precosEditados, setPrecosEditados] = useState<Record<string, number>>(lerPrecosSalvos);

  useEffect(() => {
    window.localStorage.setItem(PRECOS_STORAGE_KEY, JSON.stringify(precosEditados));
  }, [precosEditados]);

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
  };

  const restaurarPreco = (produto: string) => {
    setPrecosEditados((atual) => {
      if (!(produto in atual)) return atual;
      const resto = { ...atual };
      delete resto[produto];
      return resto;
    });
  };

  const restaurarTodosPrecos = () => setPrecosEditados({});

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
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppDataContext(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppDataContext deve ser usado dentro de AppDataProvider');
  return ctx;
}
