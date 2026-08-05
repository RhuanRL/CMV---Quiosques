import { useEffect, useRef, useState } from 'react';
import { useAppDataContext } from '../../context/AppDataContext';
import { useTheme } from '../../context/ThemeContext';
import { buscarHistoricoPrecos, type HistoricoPrecoEntrada } from '../../lib/supabase';
import { formatBRL } from '../../lib/format';
import { MoonIcon, RestoreIcon, SunIcon, UploadIcon } from '../ui/icons';
import { Card } from '../ui/Card';

function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function Configuracoes() {
  const { data, loja, setLoja, importarArquivo, restaurarPadrao, carregando } = useAppDataContext();
  const { theme, toggleTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const [historico, setHistorico] = useState<HistoricoPrecoEntrada[] | null>(null);
  const [erroHistorico, setErroHistorico] = useState(false);

  useEffect(() => {
    buscarHistoricoPrecos(30)
      .then(setHistorico)
      .catch(() => setErroHistorico(true));
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-6 py-6">
      <Card title="Planilha" subtitle={data ? `Dados de ${data.arquivoNome}` : carregando ? 'Carregando planilha…' : 'Nenhuma planilha carregada'}>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]"
          >
            <UploadIcon className="h-3.5 w-3.5" />
            Importar planilha
          </button>

          {data && (
            <button
              type="button"
              onClick={() => void restaurarPadrao()}
              className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
            >
              <RestoreIcon className="h-3 w-3" />
              Restaurar padrão
            </button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importarArquivo(file);
              e.target.value = '';
            }}
          />
        </div>
      </Card>

      {data && data.rateio.lojas.length > 0 && (
        <Card title="Loja ativa" subtitle="Define qual rateio de custo fixo é usado nos cálculos de margem.">
          <select
            value={loja}
            onChange={(e) => setLoja(e.target.value)}
            className="mt-3 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] outline-none transition-colors hover:border-[var(--accent)] focus:border-[var(--accent)]"
          >
            {data.rateio.lojas.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Card>
      )}

      <Card title="Aparência">
        <button
          type="button"
          onClick={toggleTheme}
          className="mt-3 flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]"
        >
          {theme === 'dark' ? <SunIcon className="h-3.5 w-3.5" /> : <MoonIcon className="h-3.5 w-3.5" />}
          {theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
        </button>
      </Card>

      <Card title="Histórico de preços" subtitle="Últimas alterações de preço de venda registradas, mais recentes primeiro.">
        {erroHistorico && (
          <p className="mt-3 text-xs text-[var(--warning-text)]">Não consegui buscar o histórico no Supabase agora.</p>
        )}
        {!erroHistorico && historico === null && (
          <p className="mt-3 text-xs text-[var(--text-muted)]">Carregando…</p>
        )}
        {!erroHistorico && historico !== null && historico.length === 0 && (
          <p className="mt-3 text-xs text-[var(--text-muted)]">Nenhuma alteração de preço registrada ainda.</p>
        )}
        {!erroHistorico && historico !== null && historico.length > 0 && (
          <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto text-sm">
            {historico.map((h, idx) => (
              <li
                key={`${h.produto}-${h.alterado_em}-${idx}`}
                className="flex items-center justify-between gap-3 border-b border-[var(--border)]/60 pb-2 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-[var(--text-primary)]">{h.produto}</p>
                  <p className="text-xs text-[var(--text-muted)]">{formatDataHora(h.alterado_em)}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[var(--text-muted)] line-through">{formatBRL(h.preco_anterior)}</span>
                  <span className="font-medium text-[var(--text-primary)]">{formatBRL(h.preco_novo)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
