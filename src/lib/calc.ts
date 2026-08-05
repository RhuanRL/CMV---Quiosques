import type { Configuracoes, MetodoRateio, Produto, ProdutoCalculadoBase, StatusSemaforo } from '../types';

/** Parâmetros que definem como o custo fixo (Custo Operacional) é rateado pra um produto específico. */
export interface ParametrosRateio {
  metodoRateio: MetodoRateio;
  /** R$ de custo fixo que cada kg vendido na loja precisa cobrir — usado quando metodoRateio === 'peso'. */
  custoOperacionalPorKg: number;
  /** Custo fixo rateado por unidade no modelo antigo (total ÷ volume em unidades) — usado quando metodoRateio === 'unitario'. */
  custoFixoRateadoUnitario: number;
  /** Valor em R$ definido à mão — usado quando metodoRateio === 'manual'. */
  valorManual: number;
}

/** Grupos tratados como revenda simples (água, refrigerante, suco...) não recebem rateio de custo fixo por padrão. */
const GRUPOS_REVENDA = new Set(['Bebidas']);

/** Método de rateio padrão de um produto, a partir do grupo/categoria dele — usado quando não há override manual. */
export function metodoRateioPadrao(grupo: string): MetodoRateio {
  return GRUPOS_REVENDA.has(grupo) ? 'isento' : 'peso';
}

/** Custo Operacional (rateio do custo fixo) de um produto, conforme o método escolhido. */
function calcularCustoOperacional(parametros: ParametrosRateio, pesoKg: number): number {
  switch (parametros.metodoRateio) {
    case 'peso':
      return pesoKg * parametros.custoOperacionalPorKg;
    case 'unitario':
      return parametros.custoFixoRateadoUnitario;
    case 'manual':
      return parametros.valorManual;
    case 'isento':
      return 0;
  }
}

/**
 * Calcula CMV, custo operacional, custos variáveis, lucro líquido, margem e preço sugerido de um produto.
 * As quatro fatias do preço (CMV / Custo Operacional / Custos Variáveis / Lucro Líquido) ficam explícitas
 * no retorno em vez de um único "custo agregado".
 */
export function calcularProduto(
  produto: Produto,
  parametrosRateio: ParametrosRateio,
  config: Configuracoes,
  margemLiquidaDesejada = config.margemLiquidaDesejada,
): ProdutoCalculadoBase {
  const { precoPraticado, custoInsumosComPerdas, pesoTotal } = produto;
  const encargos = config.impostos + config.taxaCartao + config.comissao;

  const pesoKg = pesoTotal / 1000;
  const custoFixoRateado = calcularCustoOperacional(parametrosRateio, pesoKg);
  const custosVariaveis = precoPraticado * encargos;

  const custoTotalUnitario = custoInsumosComPerdas + custoFixoRateado;
  const cmvReal = precoPraticado > 0 ? custoInsumosComPerdas / precoPraticado : 0;
  const lucroLiquidoReal = precoPraticado - custoTotalUnitario - custosVariaveis;
  const margemReal = precoPraticado > 0 ? lucroLiquidoReal / precoPraticado : 0;
  const divisor = 1 - margemLiquidaDesejada - encargos;
  const precoSugerido = divisor > 0 ? custoTotalUnitario / divisor : 0;

  return {
    ...produto,
    metodoRateio: parametrosRateio.metodoRateio,
    pesoKg,
    custoFixoRateado,
    custosVariaveis,
    custoTotalUnitario,
    precoSugerido,
    cmvReal,
    margemReal,
    lucroLiquidoReal,
    status: statusSemaforo(margemReal, margemLiquidaDesejada),
  };
}

/** Preço de venda necessário pra bater uma margem líquida específica, a partir do custo total já calculado. */
export function precoParaMargem(custoTotalUnitario: number, margemAlvo: number, encargos: number): number {
  const divisor = 1 - margemAlvo - encargos;
  return divisor > 0 ? custoTotalUnitario / divisor : 0;
}

export function statusSemaforo(margemReal: number, margemDesejada: number): StatusSemaforo {
  if (margemDesejada <= 0) return margemReal >= 0 ? 'verde' : 'vermelho';
  if (margemReal >= margemDesejada) return 'verde';
  if (margemReal >= margemDesejada * 0.8) return 'amarelo';
  return 'vermelho';
}

export const STATUS_LABEL: Record<StatusSemaforo, string> = {
  verde: 'Margem saudável',
  amarelo: 'Atenção',
  vermelho: 'Abaixo da meta',
};

export const METODO_RATEIO_LABEL: Record<MetodoRateio, string> = {
  peso: 'Por peso (kg)',
  unitario: 'Por unidade (antigo)',
  manual: 'Manual',
  isento: 'Isento',
};
