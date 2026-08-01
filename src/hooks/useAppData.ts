import { useCallback, useEffect, useState } from 'react';
import { parseWorkbook, readWorkbookFromArrayBuffer } from '../lib/excelParser';
import type { AppData } from '../types';

const DEFAULT_FILE_URL = '/CMVFastAcaiV9.xlsx';
const STORAGE_KEY = 'cmv-dashboard-arquivo';

interface StoredFile {
  nome: string;
  base64: string;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

interface UseAppDataResult {
  data: AppData | null;
  erro: string | null;
  carregando: boolean;
  importarArquivo: (file: File) => Promise<void>;
  restaurarPadrao: () => Promise<void>;
}

export function useAppData(): UseAppDataResult {
  const [data, setData] = useState<AppData | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregarDoBuffer = useCallback((buffer: ArrayBuffer, nome: string) => {
    const wb = readWorkbookFromArrayBuffer(buffer);
    const parsed = parseWorkbook(wb, nome);
    setData(parsed);
    setErro(null);
  }, []);

  const carregarPadrao = useCallback(async () => {
    setCarregando(true);
    try {
      const resp = await fetch(DEFAULT_FILE_URL);
      if (!resp.ok) throw new Error('not found');
      const buffer = await resp.arrayBuffer();
      carregarDoBuffer(buffer, 'CMVFastAcaiV9.xlsx');
    } catch {
      setErro(
        'Não encontrei a planilha padrão em /data/CMVFastAcaiV9.xlsx. Use o botão "Importar nova planilha" para carregar o arquivo.',
      );
    } finally {
      setCarregando(false);
    }
  }, [carregarDoBuffer]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: StoredFile = JSON.parse(stored);
        carregarDoBuffer(base64ToBuffer(parsed.base64), parsed.nome);
        setCarregando(false);
        return;
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    void carregarPadrao();
  }, [carregarDoBuffer, carregarPadrao]);

  const importarArquivo = useCallback(
    async (file: File) => {
      setCarregando(true);
      try {
        const buffer = await file.arrayBuffer();
        carregarDoBuffer(buffer, file.name);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ nome: file.name, base64: bufferToBase64(buffer) } satisfies StoredFile),
        );
      } catch {
        setErro(`Não consegui ler o arquivo "${file.name}". Verifique se é um .xlsx válido no formato esperado.`);
      } finally {
        setCarregando(false);
      }
    },
    [carregarDoBuffer],
  );

  const restaurarPadrao = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY);
    await carregarPadrao();
  }, [carregarPadrao]);

  return { data, erro, carregando, importarArquivo, restaurarPadrao };
}
