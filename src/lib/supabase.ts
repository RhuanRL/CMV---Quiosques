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
  | 'overrides_volume'
  | 'overrides_volume_kg'
  | 'overrides_rateio_manual';

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

/** Busca os métodos de rateio (peso/unitario/manual/isento) editados, como um mapa produto -> método. */
export async function buscarMetodosRateio(): Promise<Record<string, string>> {
  const resp = await fetch(`${REST_URL}/overrides_metodo_rateio?select=produto,metodo`, { headers: baseHeaders });
  if (!resp.ok) throw new Error(`Falha ao buscar overrides_metodo_rateio: ${resp.status}`);
  const linhas: Array<{ produto: string; metodo: string }> = await resp.json();
  const mapa: Record<string, string> = {};
  for (const linha of linhas) mapa[linha.produto] = linha.metodo;
  return mapa;
}

/** Grava (upsert) o método de rateio escolhido pra um produto. */
export async function salvarMetodoRateio(produto: string, metodo: string): Promise<void> {
  const resp = await fetch(`${REST_URL}/overrides_metodo_rateio`, {
    method: 'POST',
    headers: { ...baseHeaders, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([{ produto, metodo, atualizado_em: new Date().toISOString() }]),
  });
  if (!resp.ok) throw new Error(`Falha ao salvar método de rateio: ${resp.status}`);
}

/** Remove o método de rateio customizado de um produto (volta pro padrão inferido do grupo). */
export async function removerMetodoRateio(produto: string): Promise<void> {
  const resp = await fetch(`${REST_URL}/overrides_metodo_rateio?produto=eq.${encodeURIComponent(produto)}`, {
    method: 'DELETE',
    headers: baseHeaders,
  });
  if (!resp.ok) throw new Error(`Falha ao remover método de rateio: ${resp.status}`);
}

export interface HistoricoPrecoEntrada {
  produto: string;
  preco_anterior: number;
  preco_novo: number;
  alterado_em: string;
}

/** Registra uma alteração de preço no histórico (fire-and-forget — nunca deve travar a edição do preço). */
export async function registrarHistoricoPreco(produto: string, precoAnterior: number, precoNovo: number): Promise<void> {
  const resp = await fetch(`${REST_URL}/historico_precos`, {
    method: 'POST',
    headers: { ...baseHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify([{ produto, preco_anterior: precoAnterior, preco_novo: precoNovo }]),
  });
  if (!resp.ok) throw new Error(`Falha ao registrar histórico de preço: ${resp.status}`);
}

/** Busca as últimas alterações de preço registradas, mais recentes primeiro. */
export async function buscarHistoricoPrecos(limite = 50): Promise<HistoricoPrecoEntrada[]> {
  const resp = await fetch(
    `${REST_URL}/historico_precos?select=produto,preco_anterior,preco_novo,alterado_em&order=alterado_em.desc&limit=${limite}`,
    { headers: baseHeaders },
  );
  if (!resp.ok) throw new Error(`Falha ao buscar histórico de preços: ${resp.status}`);
  return resp.json();
}
