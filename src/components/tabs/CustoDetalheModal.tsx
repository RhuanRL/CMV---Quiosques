import { useEffect } from 'react';
import { useAppDataContext } from '../../context/AppDataContext';
import { METODO_RATEIO_LABEL } from '../../lib/calc';
import { formatBRL, formatPercent } from '../../lib/format';
import type { ProdutoCalculado } from '../../types';
import { CloseIcon } from '../ui/icons';

interface Props {
  produto: ProdutoCalculado;
  onClose: () => void;
}

/** Mostra de onde vem o custo de um produto: ingrediente a ingrediente, depois perdas e custo fixo rateado. */
export function CustoDetalheModal({ produto, onClose }: Props) {
  const { data } = useAppDataContext();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!data) return null;

  const itens = data.fichaTecnica[produto.produto] ?? [];
  const subtotalItens = itens.reduce((soma, item) => soma + item.custoTotal, 0);
  const custoInsumosBase = itens.length > 0 ? subtotalItens : produto.custoInsumos;
  const perdas = produto.custoInsumosComPerdas - custoInsumosBase;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-[var(--shadow-card)]"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-1)] px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recomposição do custo</h3>
            <p className="text-xs text-[var(--text-muted)]">{produto.produto}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)]"
            aria-label="Fechar"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          {itens.length > 0 ? (
            <table className="w-full border-collapse text-sm">
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
            <p className="text-xs text-[var(--text-muted)]">
              Este produto não tem ficha técnica detalhada por ingrediente na planilha — abaixo está só o total de
              insumos.
            </p>
          )}

          <div className="mt-4 space-y-1.5 border-t border-[var(--border)] pt-3 text-sm">
            <Linha label="Custo dos insumos" valor={custoInsumosBase} />
            <Linha
              label={`Perdas (${formatPercent(data.config.perdas)})`}
              valor={perdas}
              prefixo="+"
              muted
            />
            <Linha label="= CMV (insumos com perdas)" valor={produto.custoInsumosComPerdas} destaque />
            <Linha
              label={`Custo operacional (${METODO_RATEIO_LABEL[produto.metodoRateio]})`}
              valor={produto.custoFixoRateado}
              prefixo="+"
              muted
            />
            <Linha label="Custos variáveis (impostos + cartão + comissão)" valor={produto.custosVariaveis} prefixo="+" muted />
            <Linha label="= Custo total unitário" valor={produto.custoTotalUnitario} destaque />
            <Linha label="Lucro líquido" valor={produto.lucroLiquidoReal} destaque forte />
          </div>
        </div>
      </div>
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
