import { useRef } from 'react';
import { useAppDataContext } from '../../context/AppDataContext';
import { useTheme } from '../../context/ThemeContext';
import { MoonIcon, RestoreIcon, SunIcon, UploadIcon } from '../ui/icons';
import { Card } from '../ui/Card';

export function Configuracoes() {
  const { data, loja, setLoja, importarArquivo, restaurarPadrao, carregando } = useAppDataContext();
  const { theme, toggleTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

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
    </div>
  );
}
