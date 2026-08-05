import { useMemo, useState } from 'react';
import { useAppDataContext } from '../../context/AppDataContext';
import { calcularProduto } from '../../lib/calc';
import { formatBRL, formatPercent } from '../../lib/format';
import { Card } from '../ui/Card';
import { InfoTermo } from '../ui/InfoTermo';
import { StatusBadge } from '../ui/StatusBadge';

/** Parte do preço de venda praticado hoje: sugere um preço a partir do custo do produto e da margem
 * desejada — o preço praticado só entra depois, como referência de comparação. */
export function Simulador() {
  const { data, custoFixoRateado, produtosCalculados } = useAppDataContext();
  const [produtoNome, setProdutoNome] = useState<string>('');
  const [margemDesejada, setMargemDesejada] = useState<number | null>(null);

  const nomeAtivo = produtoNome || produtosCalculados[0]?.produto || '';
  const produto = produtosCalculados.find((p) => p.produto === nomeAtivo);
  const margemAtiva = margemDesejada ?? data?.config.margemLiquidaDesejada ?? 0.15;

  const resultado = useMemo(() => {
    if (!produto || !data) return null;
    return calcularProduto(produto, custoFixoRateado, data.config, margemAtiva);
  }, [produto, data, custoFixoRateado, margemAtiva]);

  if (!data || !produto || !resultado) return null;

  const diferenca = produto.precoPraticado - resultado.precoSugerido;
  const acimaDoSugerido = diferenca >= 0;

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
            <InfoTermo explicacao="Custo dos insumos com perdas, mais o custo fixo rateado da loja atual — é a base de tudo: nenhum preço abaixo disso dá lucro.">
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
    </div>
  );
}
