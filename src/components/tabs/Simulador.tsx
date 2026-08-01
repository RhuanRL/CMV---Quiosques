import { useMemo, useState } from 'react';
import { useAppDataContext } from '../../context/AppDataContext';
import { calcularProduto } from '../../lib/calc';
import { formatBRL, formatPercent } from '../../lib/format';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';

export function Simulador() {
  const { data, custoFixoRateado } = useAppDataContext();
  const [produtoNome, setProdutoNome] = useState<string>('');
  const [margemDesejada, setMargemDesejada] = useState<number>(0.15);

  const produtos = data?.produtos ?? [];
  const nomeAtivo = produtoNome || produtos[0]?.produto || '';
  const produto = produtos.find((p) => p.produto === nomeAtivo);

  const resultado = useMemo(() => {
    if (!produto || !data) return null;
    return calcularProduto(produto, custoFixoRateado, data.config, margemDesejada);
  }, [produto, data, custoFixoRateado, margemDesejada]);

  if (!data || !produto || !resultado) return null;

  const diferenca = produto.precoPraticado - resultado.precoSugerido;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
      <Card>
        <label className="block text-sm font-medium text-[var(--text-secondary)]">Produto</label>
        <select
          value={nomeAtivo}
          onChange={(e) => setProdutoNome(e.target.value)}
          className="mt-2 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors hover:border-[var(--accent)] focus:border-[var(--accent)]"
        >
          {produtos.map((p) => (
            <option key={p.produto} value={p.produto}>
              {p.produto}
            </option>
          ))}
        </select>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[var(--text-secondary)]">Margem líquida desejada</label>
            <span className="text-sm font-semibold text-[var(--accent-text)]">{formatPercent(margemDesejada)}</span>
          </div>
          <input
            type="range"
            min={5}
            max={30}
            step={0.5}
            value={margemDesejada * 100}
            onChange={(e) => setMargemDesejada(Number(e.target.value) / 100)}
            className="mt-3 w-full accent-[var(--accent)]"
          />
          <div className="mt-1 flex justify-between text-xs text-[var(--text-muted)]">
            <span>5%</span>
            <span>30%</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card title="Preço praticado hoje">
          <p className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{formatBRL(produto.precoPraticado)}</p>
        </Card>
        <Card title="Preço sugerido para a margem escolhida">
          <p className="mt-2 text-3xl font-semibold text-[var(--accent-text)]">{formatBRL(resultado.precoSugerido)}</p>
        </Card>
      </div>

      <Card title="Comparativo">
        <div className="mt-3 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Diferença (praticado − sugerido)</span>
            <span
              className={`font-medium ${diferenca >= 0 ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}`}
            >
              {diferenca >= 0 ? '+' : ''}
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
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Custo total unitário</span>
            <span className="font-medium text-[var(--text-primary)]">{formatBRL(resultado.custoTotalUnitario)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
