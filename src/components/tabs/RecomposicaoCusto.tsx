import { useMemo, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { useAppDataContext } from '../../context/AppDataContext';
import { useTheme } from '../../context/ThemeContext';
import { METODO_RATEIO_LABEL } from '../../lib/calc';
import { chartPalette } from '../../lib/chartTheme';
import { formatBRL, formatPercent } from '../../lib/format';
import type { MetodoRateio } from '../../types';
import { Card } from '../ui/Card';
import { InfoTermo } from '../ui/InfoTermo';
import { RestoreIcon } from '../ui/icons';

const METODOS: MetodoRateio[] = ['peso', 'unitario', 'manual', 'isento'];

/** Página dedicada à recomposição de custo: escolhe um produto e vê as 4 fatias do preço separadas —
 * CMV, Custo Operacional (rateio), Custos Variáveis e Lucro Líquido — em vez de um custo agregado único. */
export function RecomposicaoCusto() {
  const {
    data,
    produtosCalculados,
    custoOperacionalPorKg,
    editarMetodoRateio,
    restaurarMetodoRateio,
    editarValorManualRateio,
  } = useAppDataContext();
  const { theme } = useTheme();
  const palette = chartPalette(theme);
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>('');

  const produto = useMemo(() => {
    if (produtosCalculados.length === 0) return undefined;
    return produtosCalculados.find((p) => p.produto === produtoSelecionado) ?? produtosCalculados[0];
  }, [produtosCalculados, produtoSelecionado]);

  if (!data || !produto) return null;

  const itens = data.fichaTecnica[produto.produto] ?? [];
  const subtotalItens = itens.reduce((soma, item) => soma + item.custoTotal, 0);
  const custoInsumosBase = itens.length > 0 ? subtotalItens : produto.custoInsumos;
  const perdas = produto.custoInsumosComPerdas - custoInsumosBase;
  const cmvTotal = produto.custoInsumosComPerdas;

  const fatias = [
    { label: 'CMV (insumos)', valor: cmvTotal },
    { label: 'Custo operacional', valor: produto.custoFixoRateado },
    { label: 'Custos variáveis', valor: produto.custosVariaveis },
    { label: 'Lucro líquido', valor: Math.max(0, produto.lucroLiquidoReal) },
  ].filter((f) => f.valor > 0);

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--text-muted)]">
          Escolha um produto pra ver as 4 fatias do preço separadas: CMV, Custo operacional, Custos variáveis e Lucro
          líquido.
        </p>
        <select
          value={produto.produto}
          onChange={(e) => setProdutoSelecionado(e.target.value)}
          className="min-w-[220px] rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] outline-none transition-colors hover:border-[var(--accent)] focus:border-[var(--accent)]"
        >
          {produtosCalculados.map((p) => (
            <option key={p.produto} value={p.produto}>
              {p.produto}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <BucketCard label="CMV" valor={cmvTotal} tom="var(--text-primary)" />
        <BucketCard label="Custo operacional" valor={produto.custoFixoRateado} tom="var(--accent-text)" />
        <BucketCard label="Custos variáveis" valor={produto.custosVariaveis} tom="var(--warning-text)" />
        <BucketCard
          label="Lucro líquido"
          valor={produto.lucroLiquidoReal}
          tom={produto.lucroLiquidoReal >= 0 ? 'var(--success-text)' : 'var(--danger-text)'}
        />
      </div>

      <Card title="Método de rateio deste produto">
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            value={produto.metodoRateio}
            onChange={(e) => editarMetodoRateio(produto.produto, e.target.value as MetodoRateio)}
            className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] outline-none transition-colors hover:border-[var(--accent)] focus:border-[var(--accent)]"
          >
            {METODOS.map((m) => (
              <option key={m} value={m}>
                {METODO_RATEIO_LABEL[m]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => restaurarMetodoRateio(produto.produto)}
            title="Voltar ao método padrão (inferido do grupo do produto)"
            className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
          >
            <RestoreIcon className="h-3 w-3" />
            Padrão
          </button>

          {produto.metodoRateio === 'peso' && (
            <span className="text-xs text-[var(--text-muted)]">
              <InfoTermo explicacao="Peso total do produto (planilha), em kg, multiplicado pelo custo operacional por kg da loja atual.">
                {produto.pesoKg.toFixed(3)} kg × {formatBRL(custoOperacionalPorKg)}/kg
              </InfoTermo>
            </span>
          )}

          {produto.metodoRateio === 'manual' && (
            <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              Valor manual (R$)
              <input
                type="number"
                step={0.5}
                min={0}
                value={produto.custoFixoRateado}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') return;
                  const n = Number(v);
                  if (Number.isFinite(n)) editarValorManualRateio(produto.produto, n);
                }}
                className="w-20 rounded-md border border-[var(--border-strong)] bg-transparent px-1.5 py-1 text-right text-sm font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </label>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          title={produto.produto}
          subtitle={`Preço de venda: ${formatBRL(produto.precoPraticado)} · Margem: ${formatPercent(produto.margemReal)}`}
          className="lg:col-span-2"
        >
          {itens.length > 0 ? (
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="py-1.5 font-medium">Ingrediente</th>
                  <th className="py-1.5 text-right font-medium">Qtd.</th>
                  <th className="py-1.5 text-right font-medium">Custo unit.</th>
                  <th className="py-1.5 text-right font-medium">Custo</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item, idx) => (
                  <tr key={`${item.ingrediente}-${idx}`} className="border-b border-[var(--border)]/60">
                    <td className="py-1.5 text-[var(--text-primary)]">
                      {item.ingrediente}
                      <span className="ml-1.5 text-[11px] text-[var(--text-muted)]">{item.categoria}</span>
                    </td>
                    <td className="py-1.5 text-right text-[var(--text-secondary)]">
                      {item.quantidade}
                      {item.unidade}
                    </td>
                    <td className="py-1.5 text-right text-[var(--text-secondary)]">{formatBRL(item.custoUnitario)}</td>
                    <td className="py-1.5 text-right font-medium text-[var(--text-primary)]">
                      {formatBRL(item.custoTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              Este produto não tem ficha técnica detalhada por ingrediente na planilha — abaixo está só o total de
              insumos.
            </p>
          )}

          <div className="mt-4 space-y-1.5 border-t border-[var(--border)] pt-3 text-sm">
            <Linha label="Custo dos insumos" valor={custoInsumosBase} />
            <Linha label={`Perdas (${formatPercent(data.config.perdas)})`} valor={perdas} prefixo="+" muted />
            <Linha label="= CMV (custo dos insumos com perdas)" valor={cmvTotal} destaque />
            <Linha
              label={`Custo operacional (${METODO_RATEIO_LABEL[produto.metodoRateio]})`}
              valor={produto.custoFixoRateado}
              prefixo="+"
              muted
            />
            <Linha label="Custos variáveis (impostos + cartão + comissão)" valor={produto.custosVariaveis} prefixo="+" muted />
            <Linha label="= Custo total unitário" valor={produto.custoTotalUnitario} destaque />
            <Linha
              label="Lucro líquido"
              valor={produto.lucroLiquidoReal}
              destaque
              forte
            />
          </div>
        </Card>

        <Card title="Pra onde vai o preço de venda">
          <div className="mx-auto mt-4 flex max-w-[220px] items-center justify-center" style={{ height: 220 }}>
            {fatias.length > 0 ? (
              <Doughnut
                data={{
                  labels: fatias.map((f) => f.label),
                  datasets: [
                    {
                      data: fatias.map((f) => f.valor),
                      backgroundColor: [...palette.doughnut, '#8f8d83'].slice(0, fatias.length),
                      borderColor: palette.surface,
                      borderWidth: 2,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom', labels: { color: palette.axis, boxWidth: 10, padding: 10 } },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatBRL(Number(ctx.raw))}` } },
                  },
                }}
              />
            ) : (
              <p className="text-sm text-[var(--text-muted)]">Sem dados de custo para este produto.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function BucketCard({ label, valor, tom }: { label: string; valor: number; tom: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold" style={{ color: tom }}>
        {formatBRL(valor)}
      </p>
    </div>
  );
}

function Linha({
  label,
  valor,
  prefixo,
  muted,
  destaque,
  forte,
}: {
  label: string;
  valor: number;
  prefixo?: string;
  muted?: boolean;
  destaque?: boolean;
  forte?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${destaque ? 'border-t border-[var(--border)] pt-1.5' : ''} ${
        muted ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'
      }`}
    >
      <span className={forte ? 'font-semibold text-[var(--text-primary)]' : undefined}>{label}</span>
      <span className={forte ? 'font-semibold text-[var(--text-primary)]' : 'font-medium'}>
        {prefixo}
        {formatBRL(valor)}
      </span>
    </div>
  );
}
