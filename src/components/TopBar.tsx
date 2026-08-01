import { useRef } from 'react';
import { useAppDataContext } from '../context/AppDataContext';
import { useTheme } from '../context/ThemeContext';
import { MoonIcon, RestoreIcon, StoreMark, SunIcon, UploadIcon } from './ui/icons';

export function TopBar() {
  const { data, loja, setLoja, importarArquivo, restaurarPadrao, carregando } = useAppDataContext();
  const { theme, toggleTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface-1)]/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-bg)] text-[var(--accent-text)]">
            <StoreMark className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[15px] font-medium leading-tight text-[var(--text-primary)]">
              Fast Açaí — Painel de CMV
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              {data ? `Dados de ${data.arquivoNome}` : carregando ? 'Carregando planilha…' : 'Nenhuma planilha carregada'}
            </p>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          {data && data.rateio.lojas.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              Loja
              <select
                value={loja}
                onChange={(e) => setLoja(e.target.value)}
                className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] outline-none transition-colors hover:border-[var(--accent)] focus:border-[var(--accent)]"
              >
                {data.rateio.lojas.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          )}

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

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            {theme === 'dark' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
          </button>

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
      </div>
    </header>
  );
}
