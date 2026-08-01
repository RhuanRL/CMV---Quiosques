export function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatPercent(valor: number, casas = 1): string {
  return `${(valor * 100).toFixed(casas)}%`;
}
