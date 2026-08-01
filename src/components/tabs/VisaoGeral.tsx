import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { useAppDataContext } from '../../context/AppDataContext';
import { useTheme } from '../../context/ThemeContext';
import { chartPalette } from '../../lib/chartTheme';
import { formatBRL, formatPercent } from '../../lib/format';
import { tamanhoParaCopo } from '../../lib/tamanho';
import { Card } from '../ui/Card';

function Indicador({ label, valor, destaque }: { label: string; valor: string; destaque?: string }) {
  return (
    <Card>
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{valor}</p>
      {destaque && <p className="mt-1 text-xs text-[var(--text-muted)]">{destaque}</p>}
    </Card>
  );
}

export function VisaoGeral() {
  const { produtosCalculados } = useAppDataContext();
  const { theme } = useTheme();
  const palette = chartPalette(theme);

  const indicadores = useMemo(() => {
    if (produtosCalculados.length === 0) {
      return { margemMedia: 0, cmvMedio: 0, ticketMedio: 0, alertasVermelhos: 0 };
    }
    const n = produtosCalculados.length;
    const margemMedia = produtosCalculados.reduce((s, p) => s + p.margemReal, 0) / n;
    const cmvMedio = produtosCalculados.reduce((s, p) => s + p.cmvReal, 0) / n;
    const ticketMedio = produtosCalculados.reduce((s, p) => s + p.precoPraticado, 0) / n;
    const alertasVermelhos = produtosCalculados.filter((p) => p.status === 'vermelho').length;
    return { margemMedia, cmvMedio, ticketMedio, alertasVermelhos };
  }, [produtosCalculados]);

  const margemPorGrupo = useMemo(() => {
    const grupos = new Map<string, { soma: number; n: number }>();
    for (const p of produtosCalculados) {
      const atual = grupos.get(p.grupo) ?? { soma: 0, n: 0 };
      atual.soma += p.margemReal;
      atual.n += 1;
      grupos.set(p.grupo, atual);
    }
    return [...grupos.entries()]
      .map(([grupo, { soma, n }]) => ({ grupo, margem: soma / n }))
      .sort((a, b) => b.margem - a.margem);
  }, [produtosCalculados]);

  const margemPorTamanho = useMemo(() => {
    const buckets = new Map<'P' | 'M' | 'G', { soma: number; n: number }>();
    for (const p of produtosCalculados) {
      if (!p.tamanho) continue;
      const copo = tamanhoParaCopo(p.tamanho);
      const atual = buckets.get(copo) ?? { soma: 0, n: 0 };
      atual.soma += p.margemReal;
      atual.n += 1;
      buckets.set(copo, atual);
    }
    return (['P', 'M', 'G'] as const)
      .filter((c) => buckets.has(c))
      .map((copo) => {
        const { soma, n } = buckets.get(copo)!;
        return { copo, margem: soma / n };
      });
  }, [produtosCalculados]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador label="Margem líquida média" valor={formatPercent(indicadores.margemMedia)} />
        <Indicador label="CMV médio" valor={formatPercent(indicadores.cmvMedio)} />
        <Indicador label="Ticket médio" valor={formatBRL(indicadores.ticketMedio)} />
        <Indicador
          label="Produtos no alerta vermelho"
          valor={String(indicadores.alertasVermelhos)}
          destaque={`de ${produtosCalculados.length} produtos`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Margem por categoria">
          <div className="mt-4" style={{ height: Math.max(180, margemPorGrupo.length * 40) }}>
            <Bar
              data={{
                labels: margemPorGrupo.map((g) => g.grupo),
                datasets: [
                  {
                    data: margemPorGrupo.map((g) => Number((g.margem * 100).toFixed(1))),
                    backgroundColor: palette.bar,
                    borderRadius: 4,
                    barThickness: 18,
                  },
                ],
              }}
              options={{
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.x}%` } } },
                scales: {
                  x: { grid: { color: palette.grid }, ticks: { color: palette.axis, callback: (v) => `${v}%` } },
                  y: { grid: { display: false }, ticks: { color: palette.axis } },
                },
              }}
            />
          </div>
        </Card>

        <Card title="Margem por tamanho de copo">
          <div className="mt-4" style={{ height: 220 }}>
            <Bar
              data={{
                labels: margemPorTamanho.map((t) => t.copo),
                datasets: [
                  {
                    data: margemPorTamanho.map((t) => Number((t.margem * 100).toFixed(1))),
                    backgroundColor: palette.bar,
                    borderRadius: 4,
                    barThickness: 40,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y}%` } } },
                scales: {
                  y: { grid: { color: palette.grid }, ticks: { color: palette.axis, callback: (v) => `${v}%` } },
                  x: { grid: { display: false }, ticks: { color: palette.axis } },
                },
              }}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
