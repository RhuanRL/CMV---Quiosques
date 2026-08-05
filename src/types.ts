export type StatusSemaforo = 'verde' | 'amarelo' | 'vermelho';

/**
 * Como o custo fixo é rateado pra um produto:
 * - peso: pesoTotal (kg) × custo operacional por kg da loja — padrão pra produtos preparados.
 * - unitario: modelo antigo (custo fixo total ÷ volume em unidades), igual pra todo produto.
 * - manual: valor em R$ definido à mão pra esse produto específico.
 * - isento: não recebe rateio de custo fixo (padrão pra revenda simples: água, refrigerante, suco).
 */
export type MetodoRateio = 'peso' | 'unitario' | 'manual' | 'isento';

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
  /** Volume médio mensal de vendas em unidades — usado só pelo método de rateio "unitario" (modelo antigo). */
  volumePorLoja: Record<string, number>;
  /** Custo fixo rateado por unidade no modelo antigo (totalPorLoja ÷ volumePorLoja) — mantido pro método "unitario". */
  rateadoPorLoja: Record<string, number>;
  /** Volume médio mensal vendido em KG — base do rateio por peso. 0 quando ainda não informado pela loja. */
  volumeKgPorLoja: Record<string, number>;
  /** totalPorLoja ÷ volumeKgPorLoja — quanto de custo fixo cada kg vendido precisa cobrir. 0 se o volume em kg não foi informado. */
  custoOperacionalPorKgPorLoja: Record<string, number>;
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
  /** Método de rateio efetivamente usado nesse produto (padrão por grupo, ou override manual). */
  metodoRateio: MetodoRateio;
  /** pesoTotal (g/ml) convertido pra kg — usado no rateio por peso. */
  pesoKg: number;
  /** Custo Operacional: fatia do custo fixo da loja que esse produto carrega, calculada conforme o metodoRateio. */
  custoFixoRateado: number;
  /** Custos Variáveis: impostos + taxa de cartão + comissão, em R$ (percentual do preço praticado). */
  custosVariaveis: number;
  /** CMV + Custo Operacional. */
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
