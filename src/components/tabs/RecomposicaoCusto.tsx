import { useMemo, useState } from 'react';
import { useAppDataContext } from '../../context/AppDataContext';
import { formatBRL, formatPercent } from '../../lib/format';
import { Card } from '../ui/Card';

/** Página dedicada à recomposição de custo: escolhe um produto e vê a composição completa —
 * ingrediente a ingrediente, perdas e custo fixo rateado — numa tela maior do que o modal da aba Produtos. */
export function RecomposicaoCusto() {
  const { data, produtosCalculados } = useAppDataContext();
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

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--text-muted)]">
          Escolha um produto para ver de onde vem o custo total: cada ingrediente da ficha técnica, as perdas e o
          custo fixo rateado da loja atual.
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

      <Card
        title={produto.produto}
        subtitle={`Preço de venda: ${formatBRL(produto.precoPraticado)} · Margem: ${formatPercent(produto.margemReal)}`}
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
          <Linha label="= Custo dos insumos com perdas" valor={produto.custoInsumosComPerdas} destaque />
          <Linha label="Custo fixo rateado (loja atual)" valor={produto.custoFixoRateado} prefixo="+" muted />
          <Linha label="= Custo total unitário" valor={produto.custoTotalUnitario} destaque forte />
        </div>
      </Card>
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
