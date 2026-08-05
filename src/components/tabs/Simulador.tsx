import { useEffect, useMemo, useState } from 'react';
import { useAppDataContext } from '../../context/AppDataContext';
import { calcularProduto, precoParaMargem, type ParametrosRateio } from '../../lib/calc';
import { formatBRL, formatPercent } from '../../lib/format';
import { Card } from '../ui/Card';
import { InfoTermo } from '../ui/InfoTermo';
import { RestoreIcon } from '../ui/icons';
import { StatusBadge } from '../ui/StatusBadge';

const MARGENS_INDICADOR = [0, 0.15, 0.2, 0.3];

/** Parte do custo do produto (não do preço praticado) e sugere um preço a partir da margem desejada.
 * Também permite simular mudanças nos itens de custo fixo e no volume vendido (kg) e ver, ao vivo,
 * como isso afeta o custo operacional/kg e a margem do produto escolhido — sem alterar nada de verdade. */
export function Simulador() {
  const { data, loja, rateioEfetivo, produtosCalculados } = useAppDataContext();
  const [produtoNome, setProdutoNome] = useState<string>('');
  const [margemDesejada, setMargemDesejada] = useState<number | null>(null);
  const [itensSimulados, setItensSimulados] = useState<Record<string, number> | null>(null);
  const [volumeKgSimulado, setVolumeKgSimulado] = useState<number | null>(null);

  const nomeAtivo = produtoNome || produtosCalculados[0]?.produto || '';
  const produto = produtosCalculados.find((p) => p.produto === nomeAtivo);
  const margemAtiva = margemDesejada ?? data?.config.margemLiquidaDesejada ?? 0.15;

  // Reseta a simulação (itens de custo fixo + volume) sempre que a loja ou os dados mudam.
  useEffect(() => {
    if (!rateioEfetivo) return;
    const base: Record<string, number> = {};
    for (const item of rateioEfetivo.itens) base[item.item] = item.porLoja[loja] ?? 0;
    setItensSimulados(base);
    setVolumeKgSimulado(rateioEfetivo.volumeKgPorLoja[loja] ?? 0);
  }, [rateioEfetivo, loja]);

  const custoFixoTotalSimulado = useMemo(() => {
    if (!itensSimulados) return 0;
    return Object.values(itensSimulados).reduce((soma, v) => soma + v, 0);
  }, [itensSimulados]);

  const volumeKgAtivo = volumeKgSimulado ?? 0;
  const custoOperacionalPorKgSimulado = volumeKgAtivo > 0 ? custoFixoTotalSimulado / volumeKgAtivo : 0;

  const volumeUnidadesAtual = rateioEfetivo?.volumePorLoja[loja] ?? 0;
  const custoFixoRateadoUnitarioSimulado =
    volumeUnidadesAtual > 0 ? custoFixoTotalSimulado / volumeUnidadesAtual : (rateioEfetivo?.rateadoPorLoja[loja] ?? 0);

  const simulacaoAlterada =
    !!rateioEfetivo &&
    (custoFixoTotalSimulado !== (rateioEfetivo.totalPorLoja[loja] ?? 0) ||
      volumeKgAtivo !== (rateioEfetivo.volumeKgPorLoja[loja] ?? 0));

  const resultado = useMemo(() => {
    if (!produto || !data) return null;
    const parametrosRateio: ParametrosRateio = {
      metodoRateio: produto.metodoRateio,
      custoOperacionalPorKg: custoOperacionalPorKgSimulado,
      custoFixoRateadoUnitario: custoFixoRateadoUnitarioSimulado,
      valorManual: produto.metodoRateio === 'manual' ? produto.custoFixoRateado : 0,
    };
    return calcularProduto(produto, parametrosRateio, data.config, margemAtiva);
  }, [produto, data, custoOperacionalPorKgSimulado, custoFixoRateadoUnitarioSimulado, margemAtiva]);

  if (!data || !produto || !resultado || !rateioEfetivo) return null;

  const encargos = data.config.impostos + data.config.taxaCartao + data.config.comissao;
  const diferenca = produto.precoPraticado - resultado.precoSugerido;
  const acimaDoSugerido = diferenca >= 0;

  const sensibilidade = [0, 0.1, 0.2, 0.3].map((incremento) => {
    const volumeSimulado = volumeKgAtivo * (1 + incremento);
    const custoPorKgSimulado = volumeSimulado > 0 ? custoFixoTotalSimulado / volumeSimulado : 0;
    const custoOperacional = produto.metodoRateio === 'peso' ? produto.pesoKg * custoPorKgSimulado : resultado.custoFixoRateado;
    const custoTotal = produto.custoInsumosComPerdas + custoOperacional;
    const lucro = produto.precoPraticado - custoTotal - produto.precoPraticado * encargos;
    const margem = produto.precoPraticado > 0 ? lucro / produto.precoPraticado : 0;
    return { incremento, custoPorKgSimulado, margem };
  });

  const resetarSimulacao = () => {
    const base: Record<string, number> = {};
    for (const item of rateioEfetivo.itens) base[item.item] = item.porLoja[loja] ?? 0;
    setItensSimulados(base);
    setVolumeKgSimulado(rateioEfetivo.volumeKgPorLoja[loja] ?? 0);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
      <Card>
        <label className="block text-sm font-medium text-[var(--text-secondary)]">Produto</label>
        <select
          value={nomeAtivo}
          onChange={(e) => setProdutoNome(e.target.value)}
          className="mt-2 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors hover:border-[var(--accent)] focus:border-[var(--accent)]"
        >
          {produtosCalculados.map((p) => (
            <option key={p.produto} value={p.produto}>
              {p.produto}
            </option>
          ))}
        </select>

        <div className="mt-3 flex items-center justify-between rounded-lg bg-[var(--surface-0)] px-3 py-2 text-sm">
          <span className="text-[var(--text-secondary)]">
            <InfoTermo explicacao="CMV (insumos com perdas) mais o Custo Operacional (rateio) desse produto — é a base de tudo: nenhum preço abaixo disso dá lucro.">
              Custo total unitário
            </InfoTermo>
          </span>
          <span className="font-semibold text-[var(--text-primary)]">{formatBRL(resultado.custoTotalUnitario)}</span>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[var(--text-secondary)]">Margem líquida desejada</label>
            <span className="text-sm font-semibold text-[var(--accent-text)]">{formatPercent(margemAtiva)}</span>
          </div>
          <input
            type="range"
            min={5}
            max={30}
            step={0.5}
            value={margemAtiva * 100}
            onChange={(e) => setMargemDesejada(Number(e.target.value) / 100)}
            className="mt-3 w-full accent-[var(--accent)]"
          />
          <div className="mt-1 flex justify-between text-xs text-[var(--text-muted)]">
            <span>5%</span>
            <span>30%</span>
          </div>
        </div>
      </Card>

      <Card
        title="Preço sugerido para a margem escolhida"
        subtitle="Calculado a partir do custo — não do preço praticado hoje."
        className="border-[var(--accent)]/30"
      >
        <p className="mt-2 text-4xl font-semibold text-[var(--accent-text)]">{formatBRL(resultado.precoSugerido)}</p>
      </Card>

      <Card title="Comparação com o preço praticado hoje">
        <div className="mt-3 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Preço praticado hoje</span>
            <span className="font-medium text-[var(--text-primary)]">{formatBRL(produto.precoPraticado)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Diferença (praticado − sugerido)</span>
            <span
              className={`font-medium ${acimaDoSugerido ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}`}
            >
              {acimaDoSugerido ? '+' : ''}
              {formatBRL(diferenca)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Margem real com o preço praticado hoje</span>
            <StatusBadge status={resultado.status}>{formatPercent(resultado.margemReal)}</StatusBadge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">CMV</span>
            <span className="font-medium text-[var(--text-primary)]">{formatPercent(resultado.cmvReal)}</span>
          </div>
        </div>
      </Card>

      <Card title="Preço mínimo por margem desejada" subtitle="A partir do custo total unitário atual deste produto.">
        <table className="mt-3 w-full border-collapse text-sm">
          <tbody>
            {MARGENS_INDICADOR.map((m) => (
              <tr key={m} className="border-b border-[var(--border)]/60 last:border-0">
                <td className="py-1.5 text-[var(--text-secondary)]">
                  {m === 0 ? 'Lucro zero (empata)' : `Margem líquida de ${formatPercent(m, 0)}`}
                </td>
                <td className="py-1.5 text-right font-medium text-[var(--text-primary)]">
                  {formatBRL(precoParaMargem(resultado.custoTotalUnitario, m, encargos))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card
        title="Simular cenário"
        subtitle="Mude os itens de custo fixo e o volume vendido (kg) e veja o impacto ao vivo — nada aqui é salvo."
      >
        {itensSimulados && (
          <div className="mt-3 space-y-3">
            {rateioEfetivo.itens.map((item) => (
              <div key={item.item} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[var(--text-secondary)]">{item.item}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[var(--text-muted)]">R$</span>
                  <input
                    type="number"
                    step={1}
                    min={0}
                    value={itensSimulados[item.item] ?? 0}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '') return;
                      const n = Number(v);
                      if (Number.isFinite(n)) setItensSimulados((atual) => ({ ...(atual ?? {}), [item.item]: n }));
                    }}
                    className="w-24 rounded-md border border-[var(--border-strong)] bg-transparent px-1.5 py-1 text-right font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3 text-sm">
              <span className="text-[var(--text-secondary)]">
                <InfoTermo explicacao="Quantos quilos essa loja vende por mês, considerado no cálculo do custo operacional/kg simulado.">
                  Volume vendido (kg)
                </InfoTermo>
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step={1}
                  min={0}
                  value={volumeKgAtivo}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '') return;
                    const n = Number(v);
                    if (Number.isFinite(n)) setVolumeKgSimulado(n);
                  }}
                  className="w-24 rounded-md border border-[var(--border-strong)] bg-transparent px-1.5 py-1 text-right font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
                <span className="text-xs text-[var(--text-muted)]">kg</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 text-sm">
              <span className="text-[var(--text-secondary)]">Custo operacional/kg simulado</span>
              <span className="font-semibold text-[var(--accent-text)]">
                {volumeKgAtivo > 0 ? `${formatBRL(custoOperacionalPorKgSimulado)}/kg` : '—'}
              </span>
            </div>

            {simulacaoAlterada && (
              <button
                type="button"
                onClick={resetarSimulacao}
                className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
              >
                <RestoreIcon className="h-3 w-3" />
                Voltar ao cenário real
              </button>
            )}
          </div>
        )}
      </Card>

      {produto.metodoRateio === 'peso' && volumeKgAtivo > 0 && (
        <Card
          title="Sensibilidade ao volume vendido"
          subtitle="Se o volume (kg) da loja crescer, mantendo o custo fixo simulado acima."
        >
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                <th className="py-1.5 font-medium">Cenário</th>
                <th className="py-1.5 text-right font-medium">Custo operacional/kg</th>
                <th className="py-1.5 text-right font-medium">Margem deste produto</th>
              </tr>
            </thead>
            <tbody>
              {sensibilidade.map((s) => (
                <tr key={s.incremento} className="border-b border-[var(--border)]/60 last:border-0">
                  <td className="py-1.5 text-[var(--text-primary)]">
                    {s.incremento === 0 ? 'Hoje' : `+${formatPercent(s.incremento, 0)}`}
                  </td>
                  <td className="py-1.5 text-right text-[var(--text-secondary)]">{formatBRL(s.custoPorKgSimulado)}/kg</td>
                  <td className="py-1.5 text-right font-medium text-[var(--text-primary)]">{formatPercent(s.margem)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
