import { useMemo, type ReactNode } from 'react';
import { Bar, Scatter } from 'react-chartjs-2';
import { useAppDataContext } from '../../context/AppDataContext';
import { useTheme } from '../../context/ThemeContext';
import { statusSemaforo } from '../../lib/calc';
import { chartPalette } from '../../lib/chartTheme';
import { formatBRL, formatPercent } from '../../lib/format';
import { tamanhoParaCopo } from '../../lib/tamanho';
import type { ProdutoCalculado, StatusSemaforo } from '../../types';
import { Card } from '../ui/Card';
import { InfoTermo } from '../ui/InfoTermo';
import { StatusBadge } from '../ui/StatusBadge';

const TONE_TEXT: Record<StatusSemaforo, string> = {
  verde: 'text-[var(--success-text)]',
  amarelo: 'text-[var(--warning-text)]',
  vermelho: 'text-[var(--danger-text)]',
};

const TONE_BORDER: Record<StatusSemaforo, string> = {
  verde: 'border-l-4 border-l-[var(--success)]',
  amarelo: 'border-l-4 border-l-[var(--warning)]',
  vermelho: 'border-l-4 border-l-[var(--danger)]',
};

function Indicador({
  label,
  valor,
  destaque,
  tom,
}: {
  label: ReactNode;
  valor: string;
  destaque?: string;
  tom?: StatusSemaforo;
}) {
  return (
    <Card className={tom ? TONE_BORDER[tom] : undefined}>
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${tom ? TONE_TEXT[tom] : 'text-[var(--text-primary)]'}`}>{valor}</p>
      {destaque && <p className="mt-1 text-xs text-[var(--text-muted)]">{destaque}</p>}
    </Card>
  );
}

/** Lista compacta de produtos (nome + badge de margem), usada no ranking de melhores/piores. */
function ListaRanking({ produtos }: { produtos: ProdutoCalculado[] }) {
  if (produtos.length === 0) {
    return <p className="mt-3 text-xs text-[var(--text-muted)]">Sem produtos suficientes ainda.</p>;
  }
  return (
    <ul className="mt-3 space-y-2">
      {produtos.map((p) => (
        <li key={p.produto} className="flex items-center justify-between gap-3 text-sm">
          <span className="truncate text-[var(--text-primary)]">{p.produto}</span>
          <StatusBadge status={p.status}>{formatPercent(p.margemReal)}</StatusBadge>
        </li>
      ))}
    </ul>
  );
}

export function VisaoGeral() {
  const { data, produtosCalculados } = useAppDataContext();
  const { theme } = useTheme();
  const palette = chartPalette(theme);

  const indicadores = useMemo(() => {
    if (produtosCalculados.length === 0) {
      return { margemMedia: 0, cmvMedio: 0, ticketMedio: 0, lucroMedio: 0, alertasVermelhos: 0 };
    }
    const n = produtosCalculados.length;
    const margemMedia = produtosCalculados.reduce((s, p) => s + p.margemReal, 0) / n;
    const cmvMedio = produtosCalculados.reduce((s, p) => s + p.cmvReal, 0) / n;
    const ticketMedio = produtosCalculados.reduce((s, p) => s + p.precoPraticado, 0) / n;
    const lucroMedio = produtosCalculados.reduce((s, p) => s + p.lucroLiquidoReal, 0) / n;
    const alertasVermelhos = produtosCalculados.filter((p) => p.status === 'vermelho').length;
    return { margemMedia, cmvMedio, ticketMedio, lucroMedio, alertasVermelhos };
  }, [produtosCalculados]);

  const { melhores, piores } = useMemo(() => {
    const ordenado = [...produtosCalculados].sort((a, b) => b.margemReal - a.margemReal);
    const n = ordenado.length;
    const k = Math.min(5, n);
    return {
      melhores: ordenado.slice(0, k),
      piores: ordenado.slice(Math.max(k, n - k)).reverse(),
    };
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

  const dispersaoPorStatus = useMemo(() => {
    const grupos: Record<StatusSemaforo, { x: number; y: number; produto: string }[]> = {
      verde: [],
      amarelo: [],
      vermelho: [],
    };
    for (const p of produtosCalculados) {
      grupos[p.status].push({ x: p.custoTotalUnitario, y: p.precoPraticado, produto: p.produto });
    }
    return grupos;
  }, [produtosCalculados]);

  if (!data) return null;

  const margemDesejada = data.config.margemLiquidaDesejada;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <h2 className="text-lg font-medium text-[var(--text-primary)]">Visão geral</h2>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
        >
          Exportar / imprimir resumo
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Indicador
          label={<InfoTermo explicacao="Média da margem líquida real de todos os produtos: quanto sobra do preço de venda depois de custos, impostos, taxas e comissão.">Margem líquida média</InfoTermo>}
          valor={formatPercent(indicadores.margemMedia)}
        />
        <Indicador
          label={<InfoTermo explicacao="Custo da Mercadoria Vendida: quanto do preço de venda é consumido só pelo custo dos insumos (com perdas), sem contar custo fixo, impostos ou taxas.">CMV médio</InfoTermo>}
          valor={formatPercent(indicadores.cmvMedio)}
        />
        <Indicador label="Ticket médio" valor={formatBRL(indicadores.ticketMedio)} />
        <Indicador
          label="Lucro líquido médio"
          valor={formatBRL(indicadores.lucroMedio)}
          destaque="por unidade vendida"
        />
        <Indicador
          label="Produtos no alerta vermelho"
          valor={String(indicadores.alertasVermelhos)}
          destaque={`de ${produtosCalculados.length} produtos`}
          tom={indicadores.alertasVermelhos > 0 ? 'vermelho' : 'verde'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Produtos com melhor margem">
          <ListaRanking produtos={melhores} />
        </Card>
        <Card title="Produtos com pior margem">
          <ListaRanking produtos={piores} />
        </Card>
      </div>

      <Card title="Saúde por categoria" subtitle="Margem média de cada categoria — a cor mostra se está dentro da meta.">
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {margemPorGrupo.map((g) => {
            const status = statusSemaforo(g.margem, margemDesejada);
            return (
              <div
                key={g.grupo}
                className={`rounded-xl bg-[var(--surface-0)] px-4 py-3 ${TONE_BORDER[status]}`}
              >
                <p className="text-sm font-medium text-[var(--text-primary)]">{g.grupo}</p>
                <p className={`mt-1 text-xl font-semibold ${TONE_TEXT[status]}`}>{formatPercent(g.margem)}</p>
              </div>
            );
          })}
        </div>
      </Card>

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

      <Card
        title="Custo x preço de venda por produto"
        subtitle="Cada ponto é um produto — quanto mais acima e à esquerda, melhor a margem. A cor segue o semáforo de status."
      >
        <div className="mt-4" style={{ height: 320 }}>
          <Scatter
            data={{
              datasets: (['verde', 'amarelo', 'vermelho'] as const).map((status) => ({
                label: status,
                data: dispersaoPorStatus[status],
                backgroundColor: palette.status[status],
                pointRadius: 5,
                pointHoverRadius: 7,
              })),
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) => {
                      const raw = ctx.raw as { produto: string; x: number; y: number };
                      return `${raw.produto}: custo ${formatBRL(raw.x)} · venda ${formatBRL(raw.y)}`;
                    },
                  },
                },
              },
              scales: {
                x: {
                  title: { display: true, text: 'Custo total unitário', color: palette.axis },
                  grid: { color: palette.grid },
                  ticks: { color: palette.axis, callback: (v) => formatBRL(Number(v)) },
                },
                y: {
                  title: { display: true, text: 'Preço de venda', color: palette.axis },
                  grid: { color: palette.grid },
                  ticks: { color: palette.axis, callback: (v) => formatBRL(Number(v)) },
                },
              },
            }}
          />
        </div>
      </Card>
    </div>
  );
}
