import type { ComponentType } from 'react';
import { useAppDataContext } from '../context/AppDataContext';
import { useTheme } from '../context/ThemeContext';
import {
  AlertIcon,
  BagIcon,
  BuildingIcon,
  ChartIcon,
  CheckCircleIcon,
  CupIcon,
  DashboardIcon,
  ListIcon,
  MoonIcon,
  PackageIcon,
  SettingsIcon,
  StoreMark,
  SunIcon,
} from './ui/icons';

interface NavItem {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

interface NavGroup {
  titulo: string;
  itens: NavItem[];
}

const GRUPOS: NavGroup[] = [
  {
    titulo: 'Análise',
    itens: [
      { id: 'visao-geral', label: 'Visão geral', icon: DashboardIcon },
      { id: 'simulador', label: 'Simulador', icon: ChartIcon },
    ],
  },
  {
    titulo: 'Precificação',
    itens: [
      { id: 'produtos', label: 'Produtos', icon: BagIcon },
      { id: 'acompanhamentos', label: 'Acompanhamentos', icon: CupIcon },
      { id: 'recomposicao', label: 'Recomposição de custo', icon: ListIcon },
    ],
  },
  {
    titulo: 'Estrutura',
    itens: [
      { id: 'custos-fixos', label: 'Custos fixos', icon: BuildingIcon },
      { id: 'insumos', label: 'Insumos', icon: PackageIcon },
    ],
  },
];

interface SidebarProps {
  active: string;
  onChange: (id: string) => void;
}

export function Sidebar({ active, onChange }: SidebarProps) {
  const { erroSincronizacao } = useAppDataContext();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="flex h-screen w-56 flex-shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-4">
      <div className="flex items-center gap-2.5 px-2 pb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-bg)] text-[var(--accent-text)]">
          <StoreMark className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[13px] font-medium leading-tight text-[var(--text-primary)]">Fast Açaí</p>
          <p className="text-[11px] text-[var(--text-muted)]">Painel de CMV</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {GRUPOS.map((grupo) => (
          <div key={grupo.titulo} className="mb-3.5">
            <p className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
              {grupo.titulo}
            </p>
            {grupo.itens.map((item) => {
              const isActive = item.id === active;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange(item.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
                    isActive
                      ? 'bg-[var(--accent-bg)] font-medium text-[var(--accent-text)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-[var(--border)] pt-2.5">
        <button
          type="button"
          onClick={() => onChange('config')}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
            active === 'config'
              ? 'bg-[var(--accent-bg)] font-medium text-[var(--accent-text)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          <SettingsIcon className="h-4 w-4 flex-shrink-0" />
          Configurações
        </button>

        <div className="mt-1 flex items-center justify-between gap-2 px-2.5 py-1.5">
          <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            {erroSincronizacao ? (
              <>
                <AlertIcon className="h-3.5 w-3.5 flex-shrink-0 text-[var(--warning-text)]" />
                <span className="truncate" title={erroSincronizacao}>
                  Sem sincronizar
                </span>
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-3.5 w-3.5 flex-shrink-0 text-[var(--success-text)]" />
                <span className="truncate">Sincronizado</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            {theme === 'dark' ? <SunIcon className="h-3.5 w-3.5" /> : <MoonIcon className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
