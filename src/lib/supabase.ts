/**
 * Cliente mínimo para o Supabase (REST/PostgREST), sem depender do pacote @supabase/supabase-js.
 * Guarda os preços editados no dashboard (Produtos e Acompanhamentos) num projeto Supabase
 * separado do financeiro, pra sincronizar entre dispositivos.
 *
 * A "anon key" abaixo é pública por design (é o que o Supabase chama de publishable key) —
 * a proteção real é a Row Level Security configurada nas tabelas.
 */
const SUPABASE_URL = 'https://hugurndtgbvfiafmzdzo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rcRc05Khqqmw9MmEtZ0lZg_1cAk7rmX';

const REST_URL = `${SUPABASE_URL}/rest/v1`;

const baseHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

type TabelaOverride =
  | 'overrides_preco'
  | 'overrides_topping'
  | 'overrides_topping_kg'
  | 'overrides_custo_fixo'
  | 'overrides_volume';

/** Busca todos os overrides de uma tabela (overrides_preco, overrides_topping ou overrides_custo_fixo) como um mapa produto -> valor. */
export async function buscarOverrides(tabela: TabelaOverride, coluna: 'preco' | 'valor'): Promise<Record<string, number>> {
  const resp = await fetch(`${REST_URL}/${tabela}?select=produto,${coluna}`, { headers: baseHeaders });
  if (!resp.ok) throw new Error(`Falha ao buscar ${tabela}: ${resp.status}`);
  const linhas: Array<{ produto: string } & Record<string, number>> = await resp.json();
  const mapa: Record<string, number> = {};
  for (const linha of linhas) mapa[linha.produto] = linha[coluna];
  return mapa;
}

/** Grava (upsert) um preço editado para um produto. */
export async function salvarOverride(
  tabela: TabelaOverride,
  coluna: 'preco' | 'valor',
  produto: string,
  valor: number,
): Promise<void> {
  const resp = await fetch(`${REST_URL}/${tabela}`, {
    method: 'POST',
    headers: { ...baseHeaders, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([{ produto, [coluna]: valor, atualizado_em: new Date().toISOString() }]),
  });
  if (!resp.ok) throw new Error(`Falha ao salvar override em ${tabela}: ${resp.status}`);
}

/** Remove o override de um produto (volta pro preço original da planilha). */
export async function removerOverride(tabela: TabelaOverride, produto: string): Promise<void> {
  const resp = await fetch(`${REST_URL}/${tabela}?produto=eq.${encodeURIComponent(produto)}`, {
    method: 'DELETE',
    headers: baseHeaders,
  });
  if (!resp.ok) throw new Error(`Falha ao remover override em ${tabela}: ${resp.status}`);
}

/** Remove todos os overrides de uma tabela. */
export async function removerTodosOverrides(tabela: TabelaOverride): Promise<void> {
  const resp = await fetch(`${REST_URL}/${tabela}?produto=neq.__nunca__`, {
    method: 'DELETE',
    headers: baseHeaders,
  });
  if (!resp.ok) throw new Error(`Falha ao limpar ${tabela}: ${resp.status}`);
}
