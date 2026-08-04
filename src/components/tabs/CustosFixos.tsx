import { useMemo } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useAppDataContext } from '../../context/AppDataContext';
import { useTheme } from '../../context/ThemeContext';
import { chartPalette } from '../../lib/chartTheme';
import { formatBRL } from '../../lib/format';
import { Card } from '../ui/Card';
import { InfoTermo } from '../ui/InfoTermo';
import { RestoreIcon } from '../ui/icons';

export function CustosFixos() {
  const {
    data,
    loja,
    custoFixoRateado,
    rateioEfetivo,
    editarCustoFixo,
    restaurarCustoFixo,
    restaurarTodosCustosFixos,
    qtdCustosFixosEditados,
    erroSincronizacao,
  } = useAppDataContext();
  const { theme } = useTheme();
  const palette = chartPalette(theme);
  if (!data || !rateioEfetivo) return null;

  const rateio = rateioEfetivo;
  const total = rateio.totalPorLoja[loja] ?? 0;
  const volume = rateio.volumePorLoja[loja] ?? 0;

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
        <Card title="Volume médio mensal de vendas">
          <p className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{volume.toLocaleString('pt-BR')}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">unidades/mês</p>
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
          <p className="mt-1 text-xs text-[var(--text-muted)]">somado ao custo de cada produto</p>
        </Card>
      </div>

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
