interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <nav className="sticky top-[65px] z-10 border-b border-[var(--border)] bg-[var(--surface-0)]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                isActive ? 'text-[var(--accent-text)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
              <span
                className={`absolute inset-x-3 -bottom-px h-0.5 rounded-full transition-colors ${
                  isActive ? 'bg-[var(--accent)]' : 'bg-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
