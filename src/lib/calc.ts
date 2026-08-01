import type { Configuracoes, Produto, ProdutoCalculadoBase, StatusSemaforo } from '../types';

/** Calcula CMV, margem, custo total e preço sugerido de um produto, replicando as fórmulas da planilha. */
export function calcularProduto(
  produto: Produto,
  custoFixoRateado: number,
  config: Configuracoes,
  margemLiquidaDesejada = config.margemLiquidaDesejada,
): ProdutoCalculadoBase {
  const { precoPraticado, custoInsumosComPerdas } = produto;
  const encargos = config.impostos + config.taxaCartao + config.comissao;

  const custoTotalUnitario = custoInsumosComPerdas + custoFixoRateado;
  const cmvReal = precoPraticado > 0 ? custoInsumosComPerdas / precoPraticado : 0;
  const lucroLiquidoReal = precoPraticado - custoTotalUnitario - precoPraticado * encargos;
  const margemReal = precoPraticado > 0 ? lucroLiquidoReal / precoPraticado : 0;
  const divisor = 1 - margemLiquidaDesejada - encargos;
  const precoSugerido = divisor > 0 ? custoTotalUnitario / divisor : 0;

  return {
    ...produto,
    custoFixoRateado,
    custoTotalUnitario,
    precoSugerido,
    cmvReal,
    margemReal,
    lucroLiquidoReal,
    status: statusSemaforo(margemReal, margemLiquidaDesejada),
  };
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
