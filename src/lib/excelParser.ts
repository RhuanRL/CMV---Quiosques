import * as XLSX from 'xlsx';
import type {
  AppData,
  Configuracoes,
  Embalagem,
  FichaTecnicaItem,
  Produto,
  RateioData,
  RateioItem,
  ToppingBloco,
  ToppingItem,
} from '../types';

type Row = (string | number)[];

function sheetRows(wb: XLSX.WorkBook, name: string): Row[] {
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`Aba "${name}" não encontrada na planilha.`);
  return XLSX.utils.sheet_to_json<Row>(ws, { header: 1, raw: true, defval: '' });
}

function isBlankRow(row: Row | undefined): boolean {
  if (!row) return true;
  return row.every((cell) => cell === '' || cell === null || cell === undefined);
}

function toNumber(cell: unknown): number {
  if (typeof cell === 'number') return cell;
  if (typeof cell === 'string') {
    const n = Number(cell.replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toText(cell: unknown): string {
  return cell === null || cell === undefined ? '' : String(cell).trim();
}

/** Separa "Açaí em Ondas 200ml" em base="Açaí em Ondas" e tamanho="200ml". */
function splitNomeTamanho(nome: string): { nomeBase: string; tamanho: string | null } {
  const match = nome.match(/^(.*?)\s+(\d+\s?m?l)$/i);
  if (match) {
    return { nomeBase: match[1].trim(), tamanho: match[2].replace(/\s+/g, '').toLowerCase() };
  }
  return { nomeBase: nome, tamanho: null };
}

function parseReceitas(wb: XLSX.WorkBook): Produto[] {
  const rows = sheetRows(wb, 'Receitas');
  const headerIdx = rows.findIndex((r) => toText(r[0]) === 'Produto');
  if (headerIdx === -1) throw new Error('Cabeçalho "Produto" não encontrado na aba Receitas.');

  const produtos: Produto[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (isBlankRow(row)) break;
    const nome = toText(row[0]);
    if (!nome) continue;
    const { nomeBase, tamanho } = splitNomeTamanho(nome);
    produtos.push({
      produto: nome,
      grupo: toText(row[1]),
      precoPraticado: toNumber(row[2]),
      pesoTotal: toNumber(row[3]),
      custoInsumos: toNumber(row[4]),
      custoInsumosComPerdas: toNumber(row[5]),
      nomeBase,
      tamanho,
    });
  }
  return produtos;
}

/** Custo da porção realmente vendida (30g, 30ml, 1 unidade...), a partir do Preço Kg/L. */
export function custoDaPorcao(precoKgL: number, unidade: string, porcao: string): number {
  if (unidade === 'un') return precoKgL;
  const match = porcao.match(/(\d+(?:[.,]\d+)?)/);
  const qtd = match ? Number(match[1].replace(',', '.')) : 30;
  return (precoKgL / 1000) * qtd;
}

function parseToppings(wb: XLSX.WorkBook): ToppingBloco[] {
  const rows = sheetRows(wb, 'Toppings');
  const blocos: ToppingBloco[] = [];
  let atual: ToppingBloco | null = null;
  let emCabecalho = false;

  for (const row of rows) {
    const primeiraCel = toText(row[0]);
    if (isBlankRow(row)) {
      continue;
    }
    if (primeiraCel.includes('porção vendida a')) {
      const precoMatch = primeiraCel.match(/R\$\s*([\d.,]+)/);
      atual = {
        titulo: primeiraCel.split('—')[0].trim(),
        precoPorcao: precoMatch ? Number(precoMatch[1].replace(',', '.')) : 0,
        itens: [],
      };
      blocos.push(atual);
      emCabecalho = true;
      continue;
    }
    if (emCabecalho && primeiraCel === 'Produto') {
      emCabecalho = false;
      continue;
    }
    if (!atual || emCabecalho) continue;

    const unidade = toText(row[2]);
    const precoKgL = toNumber(row[3]);
    const porcao = toText(row[4]);
    const item: ToppingItem = {
      produto: primeiraCel,
      fornecedor: toText(row[1]),
      unidade,
      precoKgL,
      porcao,
      custoPorcao: custoDaPorcao(precoKgL, unidade, porcao),
      valorFinal: toNumber(row[5]),
    };
    atual.itens.push(item);
  }
  return blocos;
}

function parseEmbalagens(wb: XLSX.WorkBook): Embalagem[] {
  let rows: Row[];
  try {
    rows = sheetRows(wb, 'Embalagens');
  } catch {
    return [];
  }
  const headerIdx = rows.findIndex((r) => toText(r[0]) === 'Nome');
  if (headerIdx === -1) return [];

  const itens: Embalagem[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (isBlankRow(row)) break;
    const nome = toText(row[0]);
    if (!nome) continue;
    itens.push({
      nome,
      fornecedor: toText(row[1]),
      quantidadePorCaixa: toNumber(row[2]),
      valorCaixa: toNumber(row[3]),
      custoUnitario: toNumber(row[4]),
    });
  }
  return itens;
}

/** Composição ingrediente a ingrediente de cada produto, para mostrar a recomposição do custo. */
function parseFichaTecnica(wb: XLSX.WorkBook): Record<string, FichaTecnicaItem[]> {
  let rows: Row[];
  try {
    rows = sheetRows(wb, 'Ficha_Tecnica');
  } catch {
    return {};
  }
  const headerIdx = rows.findIndex((r) => toText(r[0]) === 'Nome do Produto');
  if (headerIdx === -1) return {};

  const porProduto: Record<string, FichaTecnicaItem[]> = {};
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (isBlankRow(row)) continue;
    const produto = toText(row[0]);
    const ingrediente = toText(row[2]);
    if (!produto || !ingrediente) continue;
    const item: FichaTecnicaItem = {
      categoria: toText(row[1]),
      ingrediente,
      quantidade: toNumber(row[3]),
      unidade: toText(row[4]),
      custoUnitario: toNumber(row[5]),
      custoTotal: toNumber(row[6]),
    };
    (porProduto[produto] ??= []).push(item);
  }
  return porProduto;
}

function parseRateio(wb: XLSX.WorkBook): RateioData {
  const rows = sheetRows(wb, 'Rateio');
  const headerIdx = rows.findIndex((r) => toText(r[0]).startsWith('Item de Custo Fixo'));
  if (headerIdx === -1) throw new Error('Cabeçalho de custos fixos não encontrado na aba Rateio.');

  const headerRow = rows[headerIdx];
  const lojas: string[] = [];
  for (let c = 1; c < headerRow.length; c++) {
    const nome = toText(headerRow[c]);
    if (nome) lojas.push(nome);
  }

  const itens: RateioItem[] = [];
  let i = headerIdx + 1;
  for (; i < rows.length; i++) {
    const row = rows[i];
    if (isBlankRow(row)) break;
    const label = toText(row[0]);
    if (!label) break;
    const porLoja: Record<string, number> = {};
    lojas.forEach((loja, idx) => {
      porLoja[loja] = toNumber(row[idx + 1]);
    });
    itens.push({ item: label, porLoja });
  }

  const totalPorLoja: Record<string, number> = {};
  const volumePorLoja: Record<string, number> = {};
  const rateadoPorLoja: Record<string, number> = {};

  for (; i < rows.length; i++) {
    const row = rows[i];
    if (isBlankRow(row)) continue;
    const label = toText(row[0]);
    if (label.startsWith('Total de Custos Fixos Mensais')) {
      lojas.forEach((loja, idx) => (totalPorLoja[loja] = toNumber(row[idx + 1])));
    } else if (label.startsWith('Volume Médio Mensal')) {
      const volumeLoja1 = toNumber(row[1]);
      lojas.forEach((loja, idx) => {
        const v = toNumber(row[idx + 1]);
        volumePorLoja[loja] = v || volumeLoja1;
      });
    } else if (label.startsWith('Custo Fixo Rateado por Venda')) {
      lojas.forEach((loja, idx) => (rateadoPorLoja[loja] = toNumber(row[idx + 1])));
    }
  }

  return { lojas, itens, totalPorLoja, volumePorLoja, rateadoPorLoja };
}

function parseConfiguracoes(wb: XLSX.WorkBook): Configuracoes {
  const rows = sheetRows(wb, 'Configuracoes');
  const config: Configuracoes = {
    margemBrutaDesejada: 0.65,
    margemLiquidaDesejada: 0.15,
    impostos: 0.06,
    taxaCartao: 0.025,
    comissao: 0.12,
    perdas: 0.03,
    descontoMaximo: 0.1,
    lojaSelecionada: '',
  };

  for (const row of rows) {
    const label = toText(row[0]);
    if (!label) continue;
    if (label.includes('Margem Bruta')) config.margemBrutaDesejada = toNumber(row[1]);
    else if (label.includes('Margem Líquida')) config.margemLiquidaDesejada = toNumber(row[1]);
    else if (label.includes('Impostos')) config.impostos = toNumber(row[1]);
    else if (label.includes('Taxa Cartão')) config.taxaCartao = toNumber(row[1]);
    else if (label.includes('Comissão')) config.comissao = toNumber(row[1]);
    else if (label.includes('Perdas')) config.perdas = toNumber(row[1]);
    else if (label.includes('Desconto Máximo')) config.descontoMaximo = toNumber(row[1]);
    else if (label === 'Loja Selecionada') config.lojaSelecionada = toText(row[1]);
  }
  return config;
}

export function parseWorkbook(wb: XLSX.WorkBook, arquivoNome: string): AppData {
  return {
    produtos: parseReceitas(wb),
    toppings: parseToppings(wb),
    embalagens: parseEmbalagens(wb),
    fichaTecnica: parseFichaTecnica(wb),
    rateio: parseRateio(wb),
    config: parseConfiguracoes(wb),
    arquivoNome,
  };
}

export function readWorkbookFromArrayBuffer(buffer: ArrayBuffer): XLSX.WorkBook {
  return XLSX.read(buffer, { type: 'array' });
}
