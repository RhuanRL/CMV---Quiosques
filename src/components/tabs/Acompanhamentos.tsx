import { useCallback, useEffect, useState } from 'react';
import { useAppDataContext } from '../../context/AppDataContext';
import { custoDaPorcao } from '../../lib/excelParser';
import { formatBRL } from '../../lib/format';
import { buscarOverrides, removerOverride, removerTodosOverrides, salvarOverride } from '../../lib/supabase';
import { RestoreIcon } from '../ui/icons';
import { Card } from '../ui/Card';

const STORAGE_KEY = 'cmv-dashboard-toppings-precos';
const STORAGE_KEY_KG = 'cmv-dashboard-toppings-precos-kg';

function lerMapaSalvo(chave: string): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const salvo = window.localStorage.getItem(chave);
    if (!salvo) return {};
    const parsed = JSON.parse(salvo) as Record<string, number>;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function Acompanhamentos() {
  const { data } = useAppDataContext();
  const [precosEditados, setPrecosEditados] = useState<Record<string, number>>(() => lerMapaSalvo(STORAGE_KEY));
  const [precosKgEditados, setPrecosKgEditados] = useState<Record<string, number>>(() =>
    lerMapaSalvo(STORAGE_KEY_KG),
  );
  const [erroSync, setErroSync] = useState<string | null>(null);

  // Cache local — o dashboard funciona (com a última versão conhecida) mesmo offline.
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(precosEditados));
  }, [precosEditados]);
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY_KG, JSON.stringify(precosKgEditados));
  }, [precosKgEditados]);

  const sincronizar = useCallback(async () => {
    try {
      const [valores, valoresKg] = await Promise.all([
        buscarOverrides('overrides_topping', 'valor'),
        buscarOverrides('overrides_topping_kg', 'valor'),
      ]);
      setPrecosEditados(valores);
      setPrecosKgEditados(valoresKg);
      setErroSync(null);
    } catch {
      setErroSync('Não consegui buscar os valores mais recentes do Supabase — mostrando a última versão salva neste dispositivo.');
    }
  }, []);

  // Busca os valores editados por qualquer dispositivo ao abrir a aba, e de novo quando a aba volta a ficar ativa.
  useEffect(() => {
    void sincronizar();
    const aoFocar = () => void sincronizar();
    window.addEventListener('focus', aoFocar);
    return () => window.removeEventListener('focus', aoFocar);
  }, [sincronizar]);

  if (!data) return null;

  const qtdEditados = Object.keys(precosEditados).length + Object.keys(precosKgEditados).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--text-muted)]">
          Preço Kg/L é o custo de compra do insumo — editável, inclusive pra itens que ainda não têm preço na
          planilha. O Custo da porção recalcula na hora. Valor final é o preço de venda, também editável. As edições
          sincronizam pelo Supabase entre dispositivos.
          {erroSync && <span className="ml-1 text-[var(--warning-text)]">{erroSync}</span>}
        </p>
        {qtdEditados > 0 && (
          <button
            type="button"
            onClick={() => {
              setPrecosEditados({});
              setPrecosKgEditados({});
              Promise.all([
                removerTodosOverrides('overrides_topping'),
                removerTodosOverrides('overrides_topping_kg'),
              ]).catch(() => setErroSync('Não consegui limpar os valores editados no Supabase.'));
            }}
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
          <table className="w-full min-w-[720px] border-collapse text-sm">
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

                const precoKgEditado = precosKgEditados[item.produto];
                const precoKgEfetivo = precoKgEditado ?? item.precoKgL;
                const kgEditado = precoKgEditado !== undefined && precoKgEditado !== item.precoKgL;
                const custoPorcaoEfetivo = custoDaPorcao(precoKgEfetivo, item.unidade, item.porcao);

                return (
                  <tr key={item.produto} className={idx % 2 === 1 ? 'bg-[var(--surface-0)]' : undefined}>
                    <td className="px-3 py-3 font-medium text-[var(--text-primary)]">{item.produto}</td>
                    <td className="px-3 py-3 text-[var(--text-secondary)]">{item.fornecedor || '—'}</td>
                    <td className="px-3 py-3 text-[var(--text-secondary)]">{item.unidade}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-[var(--text-muted)]">R$</span>
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          value={precoKgEfetivo}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === '') return;
                            const n = Number(v);
                            if (Number.isFinite(n)) {
                              setPrecosKgEditados((atual) => ({ ...atual, [item.produto]: n }));
                              setErroSync(null);
                              salvarOverride('overrides_topping_kg', 'valor', item.produto, n).catch(() =>
                                setErroSync('Essa edição não foi salva no Supabase (ficou só neste dispositivo por enquanto).'),
                              );
                            }
                          }}
                          className={`w-16 rounded-md border bg-transparent px-1.5 py-1 text-right text-sm font-medium text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)] ${
                            kgEditado
                              ? 'border-[var(--accent)]/50 bg-[var(--accent-bg)]'
                              : 'border-transparent hover:border-[var(--border-strong)]'
                          }`}
                        />
                        {kgEditado && (
                          <button
                            type="button"
                            onClick={() => {
                              setPrecosKgEditados((atual) => {
                                const resto = { ...atual };
                                delete resto[item.produto];
                                return resto;
                              });
                              removerOverride('overrides_topping_kg', item.produto).catch(() =>
                                setErroSync('Não consegui desfazer esse preço no Supabase.'),
                              );
                            }}
                            title="Restaurar preço Kg/L original da planilha"
                            className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
                          >
                            <RestoreIcon className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-[var(--text-secondary)]">{item.porcao}</td>
                    <td className="px-3 py-3 text-right font-medium text-[var(--text-primary)]">
                      {custoPorcaoEfetivo > 0 ? formatBRL(custoPorcaoEfetivo) : '—'}
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
                              setErroSync(null);
                              salvarOverride('overrides_topping', 'valor', item.produto, n).catch(() =>
                                setErroSync('Essa edição não foi salva no Supabase (ficou só neste dispositivo por enquanto).'),
                              );
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
