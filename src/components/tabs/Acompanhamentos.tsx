import { useEffect, useState } from 'react';
import { useAppDataContext } from '../../context/AppDataContext';
import { formatBRL } from '../../lib/format';
import { RestoreIcon } from '../ui/icons';
import { Card } from '../ui/Card';

const STORAGE_KEY = 'cmv-dashboard-toppings-precos';

function lerPrecosSalvos(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const salvo = window.localStorage.getItem(STORAGE_KEY);
    if (!salvo) return {};
    const parsed = JSON.parse(salvo) as Record<string, number>;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function Acompanhamentos() {
  const { data } = useAppDataContext();
  const [precosEditados, setPrecosEditados] = useState<Record<string, number>>(lerPrecosSalvos);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(precosEditados));
  }, [precosEditados]);

  if (!data) return null;

  const qtdEditados = Object.keys(precosEditados).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--text-muted)]">
          Custo da porção vem do Preço Kg/L da aba Insumos. O Valor final é editável — ainda não decidiu o preço? Só
          digitar.
        </p>
        {qtdEditados > 0 && (
          <button
            type="button"
            onClick={() => setPrecosEditados({})}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
          >
            <RestoreIcon className="h-3 w-3" />
            Restaurar {qtdEditados} preço{qtdEditados > 1 ? 's' : ''} editado{qtdEditados > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {data.toppings.map((bloco) => (
        <Card
          key={bloco.titulo}
          title={bloco.titulo}
          subtitle={`Preço de tabela: ${formatBRL(bloco.precoPorcao)}`}
          className="overflow-x-auto p-0"
        >
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-3 py-3 text-left font-medium text-[var(--text-secondary)]">Produto</th>
                <th className="px-3 py-3 text-left font-medium text-[var(--text-secondary)]">Fornecedor</th>
                <th className="px-3 py-3 text-left font-medium text-[var(--text-secondary)]">Unidade</th>
                <th className="px-3 py-3 text-right font-medium text-[var(--text-secondary)]">Preço Kg/L</th>
                <th className="px-3 py-3 text-right font-medium text-[var(--text-secondary)]">Porção</th>
                <th className="px-3 py-3 text-right font-medium text-[var(--text-secondary)]">Custo da porção</th>
                <th className="px-3 py-3 text-right font-medium text-[var(--text-secondary)]">Valor final</th>
              </tr>
            </thead>
            <tbody>
              {bloco.itens.map((item, idx) => {
                const precoEditado = precosEditados[item.produto];
                const valorEfetivo = precoEditado ?? item.valorFinal;
                const editado = precoEditado !== undefined && precoEditado !== item.valorFinal;
                return (
                  <tr key={item.produto} className={idx % 2 === 1 ? 'bg-[var(--surface-0)]' : undefined}>
                    <td className="px-3 py-3 font-medium text-[var(--text-primary)]">{item.produto}</td>
                    <td className="px-3 py-3 text-[var(--text-secondary)]">{item.fornecedor || '—'}</td>
                    <td className="px-3 py-3 text-[var(--text-secondary)]">{item.unidade}</td>
                    <td className="px-3 py-3 text-right text-[var(--text-secondary)]">
                      {item.precoKgL > 0 ? formatBRL(item.precoKgL) : '—'}
                    </td>
                    <td className="px-3 py-3 text-right text-[var(--text-secondary)]">{item.porcao}</td>
                    <td className="px-3 py-3 text-right font-medium text-[var(--text-primary)]">
                      {item.custoPorcao > 0 ? formatBRL(item.custoPorcao) : '—'}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-[var(--text-muted)]">R$</span>
                        <input
                          type="number"
                          step={0.5}
                          min={0}
                          value={valorEfetivo}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === '') return;
                            const n = Number(v);
                            if (Number.isFinite(n)) {
                              setPrecosEditados((atual) => ({ ...atual, [item.produto]: n }));
                            }
                          }}
                          className={`w-16 rounded-md border bg-transparent px-1.5 py-1 text-right text-sm font-medium text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)] ${
                            editado
                              ? 'border-[var(--accent)]/50 bg-[var(--accent-bg)]'
                              : 'border-transparent hover:border-[var(--border-strong)]'
                          }`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ))}

      {data.embalagens.length > 0 && (
        <Card
          title="Embalagens"
          subtitle="Copos, tampas, canudo e colher — custo unitário usado na ficha técnica de cada produto"
          className="overflow-x-auto p-0"
        >
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-3 py-3 text-left font-medium text-[var(--text-secondary)]">Item</th>
                <th className="px-3 py-3 text-left font-medium text-[var(--text-secondary)]">Fornecedor</th>
                <th className="px-3 py-3 text-right font-medium text-[var(--text-secondary)]">Qtd. por caixa</th>
                <th className="px-3 py-3 text-right font-medium text-[var(--text-secondary)]">Valor da caixa</th>
                <th className="px-3 py-3 text-right font-medium text-[var(--text-secondary)]">Custo unitário</th>
              </tr>
            </thead>
            <tbody>
              {data.embalagens.map((emb, idx) => (
                <tr key={emb.nome} className={idx % 2 === 1 ? 'bg-[var(--surface-0)]' : undefined}>
                  <td className="px-3 py-3 font-medium text-[var(--text-primary)]">{emb.nome}</td>
                  <td className="px-3 py-3 text-[var(--text-secondary)]">{emb.fornecedor || '—'}</td>
                  <td className="px-3 py-3 text-right text-[var(--text-secondary)]">
                    {emb.quantidadePorCaixa > 0 ? emb.quantidadePorCaixa.toLocaleString('pt-BR') : '—'}
                  </td>
                  <td className="px-3 py-3 text-right text-[var(--text-secondary)]">
                    {emb.valorCaixa > 0 ? formatBRL(emb.valorCaixa) : '—'}
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-[var(--text-primary)]">
                    {emb.custoUnitario > 0 ? formatBRL(emb.custoUnitario) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
