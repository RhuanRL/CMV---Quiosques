import { useMemo, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useAppDataContext } from '../../context/AppDataContext';
import { useTheme } from '../../context/ThemeContext';
import { chartPalette } from '../../lib/chartTheme';
import { formatBRL, formatPercent } from '../../lib/format';
import { Card } from '../ui/Card';
import { InfoTermo } from '../ui/InfoTermo';
import { AlertIcon, RestoreIcon } from '../ui/icons';

const LIMITE_ALERTA_STORAGE_KEY = 'cmv-dashboard-limite-alerta-faturamento';

function lerLimiteAlerta(): number {
  if (typeof window === 'undefined') return 0.4;
  const salvo = Number(window.localStorage.getItem(LIMITE_ALERTA_STORAGE_KEY));
  return Number.isFinite(salvo) && salvo > 0 ? salvo : 0.4;
}

export function CustosFixos() {
  const {
    data,
    loja,
    custoFixoRateado,
    custoOperacionalPorKg,
    rateioEfetivo,
    produtosCalculados,
    editarCustoFixo,
    restaurarCustoFixo,
    restaurarTodosCustosFixos,
    qtdCustosFixosEditados,
    editarVolume,
    restaurarVolume,
    editarVolumeKg,
    restaurarVolumeKg,
    erroSincronizacao,
  } = useAppDataContext();
  const { theme } = useTheme();
  const palette = chartPalette(theme);
  const [limiteAlerta, setLimiteAlerta] = useState(lerLimiteAlerta);

  const ticketMedio = useMemo(() => {
    if (produtosCalculados.length === 0) return 0;
    return produtosCalculados.reduce((s, p) => s + p.precoPraticado, 0) / produtosCalculados.length;
  }, [produtosCalculados]);

  if (!data || !rateioEfetivo) return null;

  const rateio = rateioEfetivo;
  const total = rateio.totalPorLoja[loja] ?? 0;
  const volume = rateio.volumePorLoja[loja] ?? 0;
  const volumeEditado = (data.rateio.volumePorLoja[loja] ?? 0) !== volume;
  const volumeKg = rateio.volumeKgPorLoja[loja] ?? 0;
  const volumeKgEditado = (data.rateio.volumeKgPorLoja[loja] ?? 0) !== volumeKg;

  const custoMedioPorProduto =
    produtosCalculados.length > 0
      ? produtosCalculados.reduce((s, p) => s + p.custoFixoRateado, 0) / produtosCalculados.length
      : 0;

  const receitaMensalEstimada = ticketMedio * volume;
  const percentualFaturamento = receitaMensalEstimada > 0 ? total / receitaMensalEstimada : 0;
  const acimaDoLimite = percentualFaturamento > limiteAlerta;

  const sensibilidade = [0, 0.1, 0.2, 0.3].map((incremento) => {
    const volumeSimulado = volumeKg * (1 + incremento);
    const custoPorKgSimulado = volumeSimulado > 0 ? total / volumeSimulado : 0;
    return { incremento, volumeSimulado, custoPorKgSimulado };
  });

  const composicao = useMemo(() => {
    let funcionarios = 0;
    let aluguel = 0;
    let outros = 0;
    for (const item of rateio.itens) {
      const valor = item.porLoja[loja] ?? 0;
      if (item.item.startsWith('Funcionários')) funcionarios += valor;
      else if (item.item === 'Aluguel') aluguel += valor;
      else outros += valor;
    }
    return [
      { label: 'Funcionários', valor: funcionarios },
      { label: 'Aluguel', valor: aluguel },
      { label: 'Outros', valor: outros },
    ].filter((c) => c.valor > 0);
  }, [rateio, loja]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title="Total mensal de custos fixos">
          <p className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{formatBRL(total)}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{loja}</p>
        </Card>
        <Card
          title={
            <InfoTermo explicacao="Quantas unidades essa loja vende por mês, em média. É o divisor do rateio — sem um número real aqui, o custo fixo por venda não reflete a loja de verdade.">
              Volume médio mensal de vendas
            </InfoTermo>
          }
        >
          <div className="mt-2 flex items-baseline gap-1.5">
            <input
              type="number"
              step={1}
              min={0}
              value={volume}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') return;
                const n = Number(v);
                if (Number.isFinite(n)) editarVolume(loja, n);
              }}
              className={`w-28 rounded-md border bg-transparent text-3xl font-semibold text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)] ${
                volumeEditado
                  ? 'border-[var(--accent)]/50 bg-[var(--accent-bg)]'
                  : 'border-transparent hover:border-[var(--border-strong)]'
              }`}
            />
            {volumeEditado && (
              <button
                type="button"
                onClick={() => restaurarVolume(loja)}
                title="Restaurar valor original da planilha"
                className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
              >
                <RestoreIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">unidades/mês, editável</p>
        </Card>
        <Card
          title={
            <InfoTermo explicacao="O total de custo fixo mensal (aluguel, funcionários, etc.) dividido pelo volume de vendas — a fatia desse custo que cada unidade vendida precisa cobrir.">
              Custo fixo rateado por venda
            </InfoTermo>
          }
          className="border-[var(--accent)]/30"
        >
          <p className="mt-2 text-3xl font-semibold text-[var(--accent-text)]">{formatBRL(custoFixoRateado)}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">somado ao custo de cada produto (método unitário — só usado por produtos com esse método)</p>
        </Card>
      </div>

      <Card
        title="Painel operacional"
        subtitle="Base do rateio por peso — o método padrão pra produtos preparados."
      >
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-[var(--text-secondary)]">
              <InfoTermo explicacao="Quantos quilos essa loja vende por mês, em média (produção + revenda). É o divisor do rateio por peso.">
                Volume médio mensal (kg)
              </InfoTermo>
            </p>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <input
                type="number"
                step={1}
                min={0}
                value={volumeKg}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') return;
                  const n = Number(v);
                  if (Number.isFinite(n)) editarVolumeKg(loja, n);
                }}
                className={`w-24 rounded-md border bg-transparent text-2xl font-semibold text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)] ${
                  volumeKgEditado
                    ? 'border-[var(--accent)]/50 bg-[var(--accent-bg)]'
                    : 'border-transparent hover:border-[var(--border-strong)]'
                }`}
              />
              {volumeKgEditado && (
                <button
                  type="button"
                  onClick={() => restaurarVolumeKg(loja)}
                  title="Voltar pra 'não informado'"
                  className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
                >
                  <RestoreIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {volumeKg === 0 && <p className="mt-0.5 text-[11px] text-[var(--warning-text)]">Ainda não informado</p>}
          </div>

          <div>
            <p className="text-xs text-[var(--text-secondary)]">Custo operacional por kg</p>
            <p className="mt-1.5 text-2xl font-semibold text-[var(--accent-text)]">
              {volumeKg > 0 ? `${formatBRL(custoOperacionalPorKg)}/kg` : '—'}
            </p>
          </div>

          <div>
            <p className="text-xs text-[var(--text-secondary)]">Custo médio por produto</p>
            <p className="mt-1.5 text-2xl font-semibold text-[var(--text-primary)]">{formatBRL(custoMedioPorProduto)}</p>
          </div>

          <div>
            <p className="text-xs text-[var(--text-secondary)]">
              <InfoTermo explicacao="Custo fixo total ÷ receita mensal estimada (ticket médio × volume em unidades). Se passar do limite, o problema é estrutural da loja — nenhum ajuste de preço isolado resolve.">
                % do faturamento pro custo fixo
              </InfoTermo>
            </p>
            <p className={`mt-1.5 text-2xl font-semibold ${acimaDoLimite ? 'text-[var(--danger-text)]' : 'text-[var(--text-primary)]'}`}>
              {receitaMensalEstimada > 0 ? formatPercent(percentualFaturamento) : '—'}
            </p>
          </div>
        </div>

        {acimaDoLimite && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-bg)] px-3 py-2.5 text-sm text-[var(--danger-text)]">
            <AlertIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              O custo fixo consome {formatPercent(percentualFaturamento)} da receita estimada — acima do limite de{' '}
              {formatPercent(limiteAlerta)}. Isso é estrutural da loja (aluguel, folha, volume), não um problema de
              precificação — ajustar preço de produto não resolve sozinho.
            </span>
          </div>
        )}

        <label className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          Limite de alerta
          <input
            type="number"
            min={1}
            max={100}
            step={1}
            value={Math.round(limiteAlerta * 100)}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') return;
              const n = Number(v);
              if (Number.isFinite(n) && n > 0) {
                const novoLimite = n / 100;
                setLimiteAlerta(novoLimite);
                window.localStorage.setItem(LIMITE_ALERTA_STORAGE_KEY, String(novoLimite));
              }
            }}
            className="w-14 rounded-md border border-[var(--border-strong)] bg-transparent px-1.5 py-0.5 text-right text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          %
        </label>

        {volumeKg > 0 && (
          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <p className="text-xs font-medium text-[var(--text-secondary)]">
              Análise de sensibilidade — se o volume vendido (kg) crescer
            </p>
            <table className="mt-2 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="py-1.5 font-medium">Cenário</th>
                  <th className="py-1.5 text-right font-medium">Volume (kg)</th>
                  <th className="py-1.5 text-right font-medium">Custo operacional/kg</th>
                </tr>
              </thead>
              <tbody>
                {sensibilidade.map((s) => (
                  <tr key={s.incremento} className="border-b border-[var(--border)]/60">
                    <td className="py-1.5 text-[var(--text-primary)]">
                      {s.incremento === 0 ? 'Hoje' : `+${formatPercent(s.incremento, 0)}`}
                    </td>
                    <td className="py-1.5 text-right text-[var(--text-secondary)]">
                      {s.volumeSimulado.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
                    </td>
                    <td className="py-1.5 text-right font-medium text-[var(--text-primary)]">
                      {formatBRL(s.custoPorKgSimulado)}/kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {rateio.lojas.length > 1 && (
        <Card title="Custo fixo rateado por venda — todas as lojas" subtitle="Compara sem precisar trocar a loja ativa.">
          <div className="mt-4" style={{ height: Math.max(140, rateio.lojas.length * 38) }}>
            <Bar
              data={{
                labels: rateio.lojas,
                datasets: [
                  {
                    data: rateio.lojas.map((l) => rateio.rateadoPorLoja[l] ?? 0),
                    backgroundColor: rateio.lojas.map((l) => (l === loja ? palette.bar : palette.grid)),
                    borderRadius: 4,
                    barThickness: 18,
                  },
                ],
              }}
              options={{
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { label: (ctx) => formatBRL(ctx.parsed.x ?? 0) } },
                },
                scales: {
                  x: { grid: { color: palette.grid }, ticks: { color: palette.axis, callback: (v) => formatBRL(Number(v)) } },
                  y: { grid: { display: false }, ticks: { color: palette.axis } },
                },
              }}
            />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="overflow-x-auto p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-3">
            <div>
              <h3 className="text-sm font-medium text-[var(--text-secondary)]">Itens de custo fixo</h3>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Editável — clique no valor e digite o valor real, {loja && `pra `}
                {loja}.{erroSincronizacao && <span className="ml-1 text-[var(--warning-text)]">{erroSincronizacao}</span>}
              </p>
            </div>
            {qtdCustosFixosEditados > 0 && (
              <button
                type="button"
                onClick={restaurarTodosCustosFixos}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
              >
                <RestoreIcon className="h-3 w-3" />
                Restaurar {qtdCustosFixosEditados} valor{qtdCustosFixosEditados > 1 ? 'es' : ''} editado
                {qtdCustosFixosEditados > 1 ? 's' : ''}
              </button>
            )}
          </div>
          <table className="w-full min-w-[360px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-3 py-3 text-left font-medium text-[var(--text-secondary)]">Item</th>
                <th className="px-3 py-3 text-right font-medium text-[var(--text-secondary)]">Valor mensal</th>
              </tr>
            </thead>
            <tbody>
              {rateio.itens.map((item, idx) => {
                const valor = item.porLoja[loja] ?? 0;
                const editado = data.rateio.itens.find((i) => i.item === item.item)?.porLoja[loja] !== valor;
                return (
                  <tr key={item.item} className={idx % 2 === 1 ? 'bg-[var(--surface-0)]' : undefined}>
                    <td className="px-3 py-3 text-[var(--text-primary)]">{item.item}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-[var(--text-muted)]">R$</span>
                        <input
                          type="number"
                          step={1}
                          min={0}
                          value={valor}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === '') return;
                            const n = Number(v);
                            if (Number.isFinite(n)) editarCustoFixo(item.item, loja, n);
                          }}
                          className={`w-24 rounded-md border bg-transparent px-1.5 py-1 text-right text-sm font-medium text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)] ${
                            editado
                              ? 'border-[var(--accent)]/50 bg-[var(--accent-bg)]'
                              : 'border-transparent hover:border-[var(--border-strong)]'
                          }`}
                        />
                        {editado && (
                          <button
                            type="button"
                            onClick={() => restaurarCustoFixo(item.item, loja)}
                            title="Restaurar valor original da planilha"
                            className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
                          >
                            <RestoreIcon className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card title="Composição do custo fixo">
          <div className="mx-auto mt-4 flex max-w-xs items-center justify-center" style={{ height: 240 }}>
            {composicao.length > 0 ? (
              <Doughnut
                data={{
                  labels: composicao.map((c) => c.label),
                  datasets: [
                    {
                      data: composicao.map((c) => c.valor),
                      backgroundColor: palette.doughnut,
                      borderColor: palette.surface,
                      borderWidth: 2,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom', labels: { color: palette.axis, boxWidth: 10, padding: 16 } },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatBRL(Number(ctx.raw))}` } },
                  },
                }}
              />
            ) : (
              <p className="text-sm text-[var(--text-muted)]">Sem dados de custo para esta loja.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
