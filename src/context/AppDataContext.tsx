import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useAppData } from '../hooks/useAppData';
import { calcularProduto, metodoRateioPadrao, type ParametrosRateio } from '../lib/calc';
import {
  buscarMetodosRateio,
  buscarOverrides,
  registrarHistoricoPreco,
  removerMetodoRateio,
  removerOverride,
  removerTodosOverrides,
  salvarMetodoRateio,
  salvarOverride,
} from '../lib/supabase';
import type { AppData, MetodoRateio, ProdutoCalculado, RateioData } from '../types';

const PRECOS_STORAGE_KEY = 'cmv-dashboard-precos-editados';
const CUSTOS_FIXOS_STORAGE_KEY = 'cmv-dashboard-custos-fixos-editados';
const VOLUMES_STORAGE_KEY = 'cmv-dashboard-volumes-editados';
const VOLUMES_KG_STORAGE_KEY = 'cmv-dashboard-volumes-kg-editados';
const METODOS_RATEIO_STORAGE_KEY = 'cmv-dashboard-metodos-rateio-editados';
const VALORES_MANUAIS_STORAGE_KEY = 'cmv-dashboard-valores-manuais-rateio-editados';

function lerMapaSalvo<T>(chave: string): Record<string, T> {
  if (typeof window === 'undefined') return {};
  try {
    const salvo = window.localStorage.getItem(chave);
    if (!salvo) return {};
    const parsed = JSON.parse(salvo) as Record<string, T>;
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
  /** R$ de custo fixo que cada kg vendido na loja atual precisa cobrir — base do rateio por peso. */
  custoOperacionalPorKg: number;
  /** Rateio com os itens de custo fixo, volume (unidades e kg) e custo operacional/kg recalculados. */
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
  /** Edita o volume médio mensal de vendas (unidades) de uma loja — usado só pelo método de rateio "unitario". */
  editarVolume: (loja: string, valor: number) => void;
  /** Volta o volume (unidades) de uma loja ao valor original da planilha. */
  restaurarVolume: (loja: string) => void;
  qtdVolumesEditados: number;
  /** Edita o volume médio mensal vendido em KG de uma loja — é a base do rateio por peso. */
  editarVolumeKg: (loja: string, valor: number) => void;
  /** Volta o volume em kg de uma loja pra "não informado" (0). */
  restaurarVolumeKg: (loja: string) => void;
  qtdVolumesKgEditados: number;
  /** Define manualmente o método de rateio (peso/unitario/manual/isento) de um produto. */
  editarMetodoRateio: (produto: string, metodo: MetodoRateio) => void;
  /** Volta um produto ao método de rateio padrão (inferido do grupo). */
  restaurarMetodoRateio: (produto: string) => void;
  /** Define o valor manual de rateio (R$) de um produto — só tem efeito quando o método é "manual". */
  editarValorManualRateio: (produto: string, valor: number) => void;
  /** true enquanto busca os preços editados salvos no Supabase, na primeira carga. */
  sincronizandoPrecos: boolean;
  /** Mensagem de erro de sincronização com o Supabase, se a última tentativa falhou (o app segue funcionando com o cache local). */
  erroSincronizacao: string | null;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: PropsWithChildren) {
  const { data, erro, carregando, importarArquivo, restaurarPadrao } = useAppData();
  const [loja, setLoja] = useState<string>('');
  const [precosEditados, setPrecosEditados] = useState<Record<string, number>>(() =>
    lerMapaSalvo<number>(PRECOS_STORAGE_KEY),
  );
  const [custosFixosEditados, setCustosFixosEditados] = useState<Record<string, number>>(() =>
    lerMapaSalvo<number>(CUSTOS_FIXOS_STORAGE_KEY),
  );
  const [volumesEditados, setVolumesEditados] = useState<Record<string, number>>(() =>
    lerMapaSalvo<number>(VOLUMES_STORAGE_KEY),
  );
  const [volumesKgEditados, setVolumesKgEditados] = useState<Record<string, number>>(() =>
    lerMapaSalvo<number>(VOLUMES_KG_STORAGE_KEY),
  );
  const [metodosRateioEditados, setMetodosRateioEditados] = useState<Record<string, MetodoRateio>>(() =>
    lerMapaSalvo<MetodoRateio>(METODOS_RATEIO_STORAGE_KEY),
  );
  const [valoresManuaisEditados, setValoresManuaisEditados] = useState<Record<string, number>>(() =>
    lerMapaSalvo<number>(VALORES_MANUAIS_STORAGE_KEY),
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
  useEffect(() => {
    window.localStorage.setItem(VOLUMES_STORAGE_KEY, JSON.stringify(volumesEditados));
  }, [volumesEditados]);
  useEffect(() => {
    window.localStorage.setItem(VOLUMES_KG_STORAGE_KEY, JSON.stringify(volumesKgEditados));
  }, [volumesKgEditados]);
  useEffect(() => {
    window.localStorage.setItem(METODOS_RATEIO_STORAGE_KEY, JSON.stringify(metodosRateioEditados));
  }, [metodosRateioEditados]);
  useEffect(() => {
    window.localStorage.setItem(VALORES_MANUAIS_STORAGE_KEY, JSON.stringify(valoresManuaisEditados));
  }, [valoresManuaisEditados]);

  const sincronizarComSupabase = useCallback(async () => {
    try {
      const [precos, custosFixos, volumes, volumesKg, metodos, valoresManuais] = await Promise.all([
        buscarOverrides('overrides_preco', 'preco'),
        buscarOverrides('overrides_custo_fixo', 'valor'),
        buscarOverrides('overrides_volume', 'valor'),
        buscarOverrides('overrides_volume_kg', 'valor'),
        buscarMetodosRateio(),
        buscarOverrides('overrides_rateio_manual', 'valor'),
      ]);
      setPrecosEditados(precos);
      setCustosFixosEditados(custosFixos);
      setVolumesEditados(volumes);
      setVolumesKgEditados(volumesKg);
      setMetodosRateioEditados(metodos as Record<string, MetodoRateio>);
      setValoresManuaisEditados(valoresManuais);
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

  // Aplica os overrides de custo fixo, volume (unidades) e volume (kg) sobre o rateio da planilha,
  // recalculando total, volumes e custo rateado (unitário antigo + operacional/kg novo) por loja.
  const rateioEfetivo = useMemo<RateioData | null>(() => {
    if (!data) return null;
    const { rateio } = data;
    const temEdicao =
      Object.keys(custosFixosEditados).length > 0 ||
      Object.keys(volumesEditados).length > 0 ||
      Object.keys(volumesKgEditados).length > 0;
    if (!temEdicao) return rateio;

    const itens = rateio.itens.map((item) => {
      const porLoja: Record<string, number> = {};
      for (const l of rateio.lojas) {
        const override = custosFixosEditados[chaveCustoFixo(item.item, l)];
        porLoja[l] = override ?? item.porLoja[l] ?? 0;
      }
      return { ...item, porLoja };
    });

    const totalPorLoja: Record<string, number> = {};
    const volumePorLoja: Record<string, number> = {};
    const rateadoPorLoja: Record<string, number> = {};
    const volumeKgPorLoja: Record<string, number> = {};
    const custoOperacionalPorKgPorLoja: Record<string, number> = {};
    for (const l of rateio.lojas) {
      totalPorLoja[l] = itens.reduce((soma, item) => soma + (item.porLoja[l] ?? 0), 0);

      volumePorLoja[l] = volumesEditados[l] ?? rateio.volumePorLoja[l] ?? 0;
      rateadoPorLoja[l] = volumePorLoja[l] > 0 ? totalPorLoja[l] / volumePorLoja[l] : (rateio.rateadoPorLoja[l] ?? 0);

      volumeKgPorLoja[l] = volumesKgEditados[l] ?? rateio.volumeKgPorLoja[l] ?? 0;
      custoOperacionalPorKgPorLoja[l] = volumeKgPorLoja[l] > 0 ? totalPorLoja[l] / volumeKgPorLoja[l] : 0;
    }

    return { ...rateio, itens, totalPorLoja, volumePorLoja, rateadoPorLoja, volumeKgPorLoja, custoOperacionalPorKgPorLoja };
  }, [data, custosFixosEditados, volumesEditados, volumesKgEditados]);

  const custoFixoRateado = rateioEfetivo?.rateadoPorLoja[lojaAtiva] ?? 0;
  const custoOperacionalPorKg = rateioEfetivo?.custoOperacionalPorKgPorLoja[lojaAtiva] ?? 0;

  const produtosCalculados = useMemo(() => {
    if (!data) return [];
    return data.produtos.map((p) => {
      const precoOriginal = p.precoPraticado;
      const precoEditado = precosEditados[p.produto];
      const precoEfetivo = precoEditado ?? precoOriginal;

      const metodoRateio = metodosRateioEditados[p.produto] ?? metodoRateioPadrao(p.grupo);
      const parametrosRateio: ParametrosRateio = {
        metodoRateio,
        custoOperacionalPorKg,
        custoFixoRateadoUnitario: custoFixoRateado,
        valorManual: valoresManuaisEditados[p.produto] ?? 0,
      };

      const calculado = calcularProduto({ ...p, precoPraticado: precoEfetivo }, parametrosRateio, data.config);
      return { ...calculado, precoOriginal, editado: precoEditado !== undefined && precoEditado !== precoOriginal };
    });
  }, [data, custoFixoRateado, custoOperacionalPorKg, precosEditados, metodosRateioEditados, valoresManuaisEditados]);

  const editarPreco = (produto: string, preco: number) => {
    const precoAnterior = produtosCalculados.find((p) => p.produto === produto)?.precoPraticado ?? preco;
    setPrecosEditados((atual) => ({ ...atual, [produto]: preco }));
    setErroSincronizacao(null);
    salvarOverride('overrides_preco', 'preco', produto, preco).catch(() =>
      setErroSincronizacao('Esse preço não foi salvo no Supabase (ficou só neste dispositivo por enquanto).'),
    );
    if (precoAnterior !== preco) {
      registrarHistoricoPreco(produto, precoAnterior, preco).catch(() => {
        // Histórico é informativo — uma falha aqui não deve travar a edição do preço nem gerar alerta pro usuário.
      });
    }
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

  const editarVolume = (lojaAlvo: string, valor: number) => {
    setVolumesEditados((atual) => ({ ...atual, [lojaAlvo]: valor }));
    setErroSincronizacao(null);
    salvarOverride('overrides_volume', 'valor', lojaAlvo, valor).catch(() =>
      setErroSincronizacao('Esse volume não foi salvo no Supabase (ficou só neste dispositivo por enquanto).'),
    );
  };

  const restaurarVolume = (lojaAlvo: string) => {
    setVolumesEditados((atual) => {
      if (!(lojaAlvo in atual)) return atual;
      const resto = { ...atual };
      delete resto[lojaAlvo];
      return resto;
    });
    removerOverride('overrides_volume', lojaAlvo).catch(() =>
      setErroSincronizacao('Não consegui desfazer esse volume no Supabase.'),
    );
  };

  const editarVolumeKg = (lojaAlvo: string, valor: number) => {
    setVolumesKgEditados((atual) => ({ ...atual, [lojaAlvo]: valor }));
    setErroSincronizacao(null);
    salvarOverride('overrides_volume_kg', 'valor', lojaAlvo, valor).catch(() =>
      setErroSincronizacao('Esse volume em kg não foi salvo no Supabase (ficou só neste dispositivo por enquanto).'),
    );
  };

  const restaurarVolumeKg = (lojaAlvo: string) => {
    setVolumesKgEditados((atual) => {
      if (!(lojaAlvo in atual)) return atual;
      const resto = { ...atual };
      delete resto[lojaAlvo];
      return resto;
    });
    removerOverride('overrides_volume_kg', lojaAlvo).catch(() =>
      setErroSincronizacao('Não consegui desfazer esse volume em kg no Supabase.'),
    );
  };

  const editarMetodoRateio = (produto: string, metodo: MetodoRateio) => {
    setMetodosRateioEditados((atual) => ({ ...atual, [produto]: metodo }));
    setErroSincronizacao(null);
    salvarMetodoRateio(produto, metodo).catch(() =>
      setErroSincronizacao('Esse método de rateio não foi salvo no Supabase (ficou só neste dispositivo por enquanto).'),
    );
  };

  const restaurarMetodoRateio = (produto: string) => {
    setMetodosRateioEditados((atual) => {
      if (!(produto in atual)) return atual;
      const resto = { ...atual };
      delete resto[produto];
      return resto;
    });
    removerMetodoRateio(produto).catch(() =>
      setErroSincronizacao('Não consegui desfazer o método de rateio no Supabase.'),
    );
  };

  const editarValorManualRateio = (produto: string, valor: number) => {
    setValoresManuaisEditados((atual) => ({ ...atual, [produto]: valor }));
    setErroSincronizacao(null);
    salvarOverride('overrides_rateio_manual', 'valor', produto, valor).catch(() =>
      setErroSincronizacao('Esse valor manual não foi salvo no Supabase (ficou só neste dispositivo por enquanto).'),
    );
  };

  const qtdPrecosEditados = produtosCalculados.filter((p) => p.editado).length;
  const qtdCustosFixosEditados = Object.keys(custosFixosEditados).length;
  const qtdVolumesEditados = Object.keys(volumesEditados).length;
  const qtdVolumesKgEditados = Object.keys(volumesKgEditados).length;

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
    custoOperacionalPorKg,
    rateioEfetivo,
    editarPreco,
    restaurarPreco,
    restaurarTodosPrecos,
    qtdPrecosEditados,
    editarCustoFixo,
    restaurarCustoFixo,
    restaurarTodosCustosFixos,
    qtdCustosFixosEditados,
    editarVolume,
    restaurarVolume,
    qtdVolumesEditados,
    editarVolumeKg,
    restaurarVolumeKg,
    qtdVolumesKgEditados,
    editarMetodoRateio,
    restaurarMetodoRateio,
    editarValorManualRateio,
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
