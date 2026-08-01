import { useState } from 'react';
import { TopBar } from './components/TopBar';
import { Tabs } from './components/Tabs';
import { VisaoGeral } from './components/tabs/VisaoGeral';
import { Produtos } from './components/tabs/Produtos';
import { Acompanhamentos } from './components/tabs/Acompanhamentos';
import { CustosFixos } from './components/tabs/CustosFixos';
import { Simulador } from './components/tabs/Simulador';
import { AppDataProvider, useAppDataContext } from './context/AppDataContext';
import { ThemeProvider } from './context/ThemeContext';

const TABS = [
  { id: 'visao-geral', label: 'Visão geral' },
  { id: 'produtos', label: 'Produtos' },
  { id: 'acompanhamentos', label: 'Acompanhamentos' },
  { id: 'custos-fixos', label: 'Custos fixos' },
  { id: 'simulador', label: 'Simulador' },
];

function Conteudo({ tab }: { tab: string }) {
  const { data, erro, carregando } = useAppDataContext();

  if (carregando) {
    return <p className="mx-auto max-w-7xl px-6 py-12 text-sm text-[var(--text-muted)]">Carregando planilha…</p>;
  }
  if (erro) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-bg)] p-4 text-sm text-[var(--danger-text)]">
          {erro}
        </div>
      </div>
    );
  }
  if (!data) return null;

  switch (tab) {
    case 'produtos':
      return <Produtos />;
    case 'acompanhamentos':
      return <Acompanhamentos />;
    case 'custos-fixos':
      return <CustosFixos />;
    case 'simulador':
      return <Simulador />;
    default:
      return <VisaoGeral />;
  }
}

function App() {
  const [tab, setTab] = useState('visao-geral');

  return (
    <ThemeProvider>
      <AppDataProvider>
        <div className="min-h-screen bg-[var(--surface-0)]">
          <TopBar />
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
          <Conteudo tab={tab} />
        </div>
      </AppDataProvider>
    </ThemeProvider>
  );
}

export default App;
