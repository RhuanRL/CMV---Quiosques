import { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { useAppDataContext } from '../../context/AppDataContext';
import { useTheme } from '../../context/ThemeContext';
import { chartPalette } from '../../lib/chartTheme';
import { formatBRL } from '../../lib/format';
import { Card } from '../ui/Card';

export function CustosFixos() {
  const { data, loja, custoFixoRateado } = useAppDataContext();
  const { theme } = useTheme();
  const palette = chartPalette(theme);
  if (!data) return null;

  const { rateio } = data;
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
        <Card title="Custo fixo rateado por venda" className="border-[var(--accent)]/30">
          <p className="mt-2 text-3xl font-semibold text-[var(--accent-text)]">{formatBRL(custoFixoRateado)}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">somado ao custo de cada produto</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Itens de custo fixo" className="overflow-x-auto p-0">
          <table className="w-full min-w-[360px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-3 py-3 text-left font-medium text-[var(--text-secondary)]">Item</th>
                <th className="px-3 py-3 text-right font-medium text-[var(--text-secondary)]">Valor mensal</th>
              </tr>
            </thead>
            <tbody>
              {rateio.itens.map((item, idx) => (
                <tr key={item.item} className={idx % 2 === 1 ? 'bg-[var(--surface-0)]' : undefined}>
                  <td className="px-3 py-3 text-[var(--text-primary)]">{item.item}</td>
                  <td className="px-3 py-3 text-right font-medium text-[var(--text-primary)]">
                    {formatBRL(item.porLoja[loja] ?? 0)}
                  </td>
                </tr>
              ))}
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
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatBRL(ctx.parsed)}` } },
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
