/** Converte "200ml" -> 200 para permitir ordenação numérica das colunas de tamanho. */
export function tamanhoEmMl(tamanho: string): number {
  const n = Number(tamanho.replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Mapeia um tamanho em ml para o rótulo de copo (P/M/G) usado nos gráficos. */
export function tamanhoParaCopo(tamanho: string): 'P' | 'M' | 'G' {
  const ml = tamanhoEmMl(tamanho);
  if (ml <= 260) return 'P';
  if (ml <= 400) return 'M';
  return 'G';
}
