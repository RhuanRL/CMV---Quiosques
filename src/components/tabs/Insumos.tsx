import { useMemo } from 'react';
import { useAppDataContext } from '../../context/AppDataContext';
import { formatBRL } from '../../lib/format';
import { Card } from '../ui/Card';

/** Catálogo dos insumos crus usados nas fichas técnicas, agrupados por categoria — pra revisar
 * preço e unidade de cada ingrediente sem precisar abrir um produto específico. */
export function Insumos() {
  const { data } = useAppDataContext();

  const categorias = useMemo(() => {
    if (!data) return [];
    const porCategoria = new Map<string, Map<string, { unidade: string; custoUnitario: number }>>();

    for (const itens of Object.values(data.fichaTecnica)) {
      for (const item of itens) {
        const mapaCategoria = porCategoria.get(item.categoria) ?? new Map();
        if (!mapaCategoria.has(item.ingrediente)) {
          mapaCategoria.set(item.ingrediente, { unidade: item.unidade, custoUnitario: item.custoUnitario });
        }
        porCategoria.set(item.categoria, mapaCategoria);
      }
    }

    return [...porCategoria.entries()]
      .map(([categoria, mapaIngredientes]) => ({
        categoria,
        ingredientes: [...mapaIngredientes.entries()]
          .map(([ingrediente, info]) => ({ ingrediente, ...info }))
          .sort((a, b) => a.ingrediente.localeCompare(b.ingrediente, 'pt-BR')),
      }))
      .sort((a, b) => a.categoria.localeCompare(b.categoria, 'pt-BR'));
  }, [data]);

  if (!data) return null;

  if (categorias.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-6">
        <p className="text-sm text-[var(--text-muted)]">
          Nenhuma ficha técnica detalhada foi encontrada na planilha ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-6 py-6">
      <p className="text-xs text-[var(--text-muted)]">
        Ingredientes usados nas fichas técnicas dos produtos, agrupados por categoria. O custo unitário vem da
        planilha — para editar, use a aba Produtos ou reimporte a planilha atualizada.
      </p>

      {categorias.map((grupo) => (
        <Card key={grupo.categoria} title={grupo.categoria} className="overflow-x-auto p-0">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-3 py-3 text-left font-medium text-[var(--text-secondary)]">Ingrediente</th>
                <th className="px-3 py-3 text-right font-medium text-[var(--text-secondary)]">Unidade</th>
                <th className="px-3 py-3 text-right font-medium text-[var(--text-secondary)]">Custo unitário</th>
              </tr>
            </thead>
            <tbody>
              {grupo.ingredientes.map((item, idx) => (
                <tr key={item.ingrediente} className={idx % 2 === 1 ? 'bg-[var(--surface-0)]' : undefined}>
                  <td className="px-3 py-3 font-medium text-[var(--text-primary)]">{item.ingrediente}</td>
                  <td className="px-3 py-3 text-right text-[var(--text-secondary)]">{item.unidade}</td>
                  <td className="px-3 py-3 text-right text-[var(--text-secondary)]">{formatBRL(item.custoUnitario)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}
    </div>
  );
}
