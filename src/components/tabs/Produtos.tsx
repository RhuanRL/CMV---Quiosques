import { useMemo, useState } from 'react';
import { useAppDataContext } from '../../context/AppDataContext';
import { formatBRL, formatPercent } from '../../lib/format';
import { tamanhoEmMl } from '../../lib/tamanho';
import type { ProdutoCalculado } from '../../types';
import { InfoIcon, RestoreIcon } from '../ui/icons';
import { StatusBadge } from '../ui/StatusBadge';
import { Card } from '../ui/Card';
import { CustoDetalheModal } from './CustoDetalheModal';

/** As 3 células (Custo / Venda / Margem) de um produto dentro de um grupo de tamanho. A primeira recebe a borda que separa os grupos. */
function CelulasProduto({
  produto,
  onVerCusto,
}: {
  produto: ProdutoCalculado | undefined;
  onVerCusto: (produto: ProdutoCalculado) => void;
}) {
  const { editarPreco, restaurarPreco } = useAppDataContext();

  if (!produto) {
    return (
      <>
        <td className="border-l border-[var(--border)] px-2 py-3 text-center text-sm text-[var(--text-muted)]">—</td>
        <td className="px-2 py-3 text-center text-sm text-[var(--text-muted)]">—</td>
        <td className="px-2 py-3 text-center text-sm text-[var(--text-muted)]">—</td>
      </>
    );
  }

  return (
    <>
      <td className="border-l border-[var(--border)] bg-[var(--surface-0)] px-2 py-3 text-center align-middle">
        <button
          type="button"
          onClick={() => onVerCusto(produto)}
          title="Ver recomposição do custo"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
          {formatBRL(produto.custoTotalUnitario)}
          <InfoIcon className="h-3 w-3 text-[var(--text-muted)]" />
        </button>
      </td>
      <td className="px-2 py-3 text-center align-middle">
        <div className="flex items-center justify-center gap-1">
          <span className="text-xs text-[var(--text-muted)]">R$</span>
          <input
            type="number"
            step={0.1}
            min={0}
            value={produto.precoPraticado}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') return;
              const n = Number(v);
              if (Number.isFinite(n)) editarPreco(produto.produto, n);
            }}
            title={produto.editado ? `Original: ${formatBRL(produto.precoOriginal)}` : undefined}
            className={`w-[4.25rem] rounded-md border bg-transparent px-1.5 py-1 text-center text-sm font-semibold text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)] ${
              produto.editado
                ? 'border-[var(--accent)]/50 bg-[var(--accent-bg)]'
                : 'border-transparent hover:border-[var(--border-strong)]'
            }`}
          />
          {produto.editado && (
            <button
              type="button"
              onClick={() => restaurarPreco(produto.produto)}
              title={`Restaurar para ${formatBRL(produto.precoOriginal)}`}
              className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
            >
              <RestoreIcon className="h-3 w-3" />
            </button>
          )}
        </div>
      </td>
      <td className="px-2 py-3 text-center align-middle">
        <StatusBadge status={produto.status}>{formatPercent(produto.margemReal)}</StatusBadge>
      </td>
    </>
  );
}

/** Cabeçalho de sub-coluna (Custo / Venda / Margem), repetido para cada tamanho. */
function SubCabecalho({ texto, comBorda }: { texto: string; comBorda: boolean }) {
  return (
    <th
      className={`px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] ${
        comBorda ? 'border-l border-[var(--border)]' : ''
      }`}
    >
      {texto}
    </th>
  );
}

export function Produtos() {
  const { produtosCalculados, qtdPrecosEditados, restaurarTodosPrecos } = useAppDataContext();

  const grupos = useMemo(() => {
    const vistos = new Set<string>();
    const ordem: string[] = [];
    for (const p of produtosCalculados) {
      if (!vistos.has(p.grupo)) {
        vistos.add(p.grupo);
        ordem.push(p.grupo);
      }
    }
    return ordem;
  }, [produtosCalculados]);

  const [grupoAtivo, setGrupoAtivo] = useState<string>('');
  const grupo = grupoAtivo || grupos[0] || '';
  const [produtoDetalhe, setProdutoDetalhe] = useState<ProdutoCalculado | null>(null);

  const { linhas, colunas } = useMemo(() => {
    const doGrupo = produtosCalculados.filter((p) => p.grupo === grupo);
    const tamanhosSet = new Set<string>();
    const basesOrdem: string[] = [];
    const basesVistas = new Set<string>();
    const porBaseTamanho = new Map<string, Map<string, ProdutoCalculado>>();

    for (const p of doGrupo) {
      if (!basesVistas.has(p.nomeBase)) {
        basesVistas.add(p.nomeBase);
        basesOrdem.push(p.nomeBase);
      }
      const chaveTamanho = p.tamanho ?? 'Único';
      if (p.tamanho) tamanhosSet.add(p.tamanho);
      const mapaBase = porBaseTamanho.get(p.nomeBase) ?? new Map<string, ProdutoCalculado>();
      mapaBase.set(chaveTamanho, p);
      porBaseTamanho.set(p.nomeBase, mapaBase);
    }

    const colunasOrdenadas = [...tamanhosSet].sort((a, b) => tamanhoEmMl(a) - tamanhoEmMl(b));
    const colunasFinais = colunasOrdenadas.length > 0 ? colunasOrdenadas : ['Único'];

    const linhasFinais = basesOrdem.map((base) => ({
      nomeBase: base,
      porTamanho: porBaseTamanho.get(base) ?? new Map(),
    }));

    return { linhas: linhasFinais, colunas: colunasFinais };
  }, [produtosCalculados, grupo]);

  if (produtosCalculados.length === 0) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {grupos.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGrupoAtivo(g)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                g === grupo
                  ? 'border-[var(--accent)]/40 bg-[var(--accent-bg)] text-[var(--accent-text)]'
                  : 'border-[var(--border-strong)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {qtdPrecosEditados > 0 && (
          <button
            type="button"
            onClick={restaurarTodosPrecos}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
          >
            <RestoreIcon className="h-3 w-3" />
            Restaurar {qtdPrecosEditados} preço{qtdPrecosEditados > 1 ? 's' : ''} editado
            {qtdPrecosEditados > 1 ? 's' : ''}
          </button>
        )}
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Cada tamanho mostra três colunas: <strong className="font-semibold text-[var(--text-secondary)]">Custo</strong>{' '}
        (clique no valor para ver a recomposição — cada ingrediente, perdas e custo fixo rateado),{' '}
        <strong className="font-semibold text-[var(--text-secondary)]">Venda</strong> (editável — clique e digite um
        novo preço para simular) e <strong className="font-semibold text-[var(--text-secondary)]">Margem</strong>{' '}
        (recalculada na hora, em toda a planilha, até você restaurar).
      </p>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th rowSpan={2} className="px-3 py-2 text-left align-bottom font-medium text-[var(--text-secondary)]">
                Produto
              </th>
              {colunas.map((c) => (
                <th
                  key={c}
                  colSpan={3}
                  className="border-l border-[var(--border)] px-2 py-2 text-center text-sm font-semibold text-[var(--text-primary)]"
                >
                  {c}
                </th>
              ))}
            </tr>
            <tr className="border-b border-[var(--border)]">
              {colunas.flatMap((c) => [
                <SubCabecalho key={`${c}-custo`} texto="Custo" comBorda />,
                <SubCabecalho key={`${c}-venda`} texto="Venda" comBorda={false} />,
                <SubCabecalho key={`${c}-margem`} texto="Margem" comBorda={false} />,
              ])}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, idx) => (
              <tr key={linha.nomeBase} className={idx % 2 === 1 ? 'bg-[var(--surface-0)]' : undefined}>
                <td className="px-3 py-3 text-left font-medium text-[var(--text-primary)]">{linha.nomeBase}</td>
                {colunas.flatMap((c) => (
                  <CelulasProduto key={c} produto={linha.porTamanho.get(c)} onVerCusto={setProdutoDetalhe} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {produtoDetalhe && <CustoDetalheModal produto={produtoDetalhe} onClose={() => setProdutoDetalhe(null)} />}
    </div>
  );
}
