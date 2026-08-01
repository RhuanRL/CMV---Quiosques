export type StatusSemaforo = 'verde' | 'amarelo' | 'vermelho';

export interface Produto {
  produto: string;
  grupo: string;
  precoPraticado: number;
  pesoTotal: number;
  custoInsumos: number;
  custoInsumosComPerdas: number;
  /** Base extraída do nome do produto (sem o tamanho), usada para agrupar em matriz. */
  nomeBase: string;
  /** Tamanho extraído do nome do produto (ex.: "200ml"), ou null se o produto não varia por tamanho. */
  tamanho: string | null;
}

export interface ToppingItem {
  produto: string;
  fornecedor: string;
  unidade: string;
  precoKgL: number;
  porcao: string;
  /** Custo da porção efetivamente usada (30g/30ml, ou 1 unidade), derivado do Preço Kg/L. */
  custoPorcao: number;
  valorFinal: number;
}

export interface ToppingBloco {
  titulo: string;
  precoPorcao: number;
  itens: ToppingItem[];
}

export interface Embalagem {
  nome: string;
  fornecedor: string;
  quantidadePorCaixa: number;
  valorCaixa: number;
  custoUnitario: number;
}

/** Um ingrediente/insumo usado na receita de um produto, com a fatia de custo que ele representa. */
export interface FichaTecnicaItem {
  categoria: string;
  ingrediente: string;
  quantidade: number;
  unidade: string;
  custoUnitario: number;
  custoTotal: number;
}

export interface RateioItem {
  item: string;
  porLoja: Record<string, number>;
}

export interface RateioData {
  lojas: string[];
  itens: RateioItem[];
  totalPorLoja: Record<string, number>;
  volumePorLoja: Record<string, number>;
  rateadoPorLoja: Record<string, number>;
}

export interface Configuracoes {
  margemBrutaDesejada: number;
  margemLiquidaDesejada: number;
  impostos: number;
  taxaCartao: number;
  comissao: number;
  perdas: number;
  descontoMaximo: number;
  lojaSelecionada: string;
}

export interface AppData {
  produtos: Produto[];
  toppings: ToppingBloco[];
  embalagens: Embalagem[];
  /** Composição (ingrediente a ingrediente) de cada produto, indexada pelo nome completo (ex.: "Açaí em Ondas 200ml"). */
  fichaTecnica: Record<string, FichaTecnicaItem[]>;
  rateio: RateioData;
  config: Configuracoes;
  arquivoNome: string;
}

export interface ProdutoCalculadoBase extends Produto {
  custoFixoRateado: number;
  custoTotalUnitario: number;
  precoSugerido: number;
  cmvReal: number;
  margemReal: number;
  lucroLiquidoReal: number;
  status: StatusSemaforo;
}

export interface ProdutoCalculado extends ProdutoCalculadoBase {
  /** Preço praticado original da planilha, antes de qualquer edição feita no dashboard. */
  precoOriginal: number;
  /** true quando o preço de venda foi editado no dashboard (ainda não gravado na planilha). */
  editado: boolean;
}
