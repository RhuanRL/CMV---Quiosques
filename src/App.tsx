import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { VisaoGeral } from './components/tabs/VisaoGeral';
import { Produtos } from './components/tabs/Produtos';
import { Acompanhamentos } from './components/tabs/Acompanhamentos';
import { CustosFixos } from './components/tabs/CustosFixos';
import { Simulador } from './components/tabs/Simulador';
import { RecomposicaoCusto } from './components/tabs/RecomposicaoCusto';
import { Insumos } from './components/tabs/Insumos';
import { Configuracoes } from './components/tabs/Configuracoes';
import { AppDataProvider, useAppDataContext } from './context/AppDataContext';
import { ThemeProvider } from './context/ThemeContext';

function Conteudo({ tab }: { tab: string }) {
  const { data, erro, carregando } = useAppDataContext();

  // Configurações fica disponível mesmo durante erro/carregamento, pra sempre dar pra importar outra planilha.
  if (tab === 'config') return <Configuracoes />;

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
    case 'recomposicao':
      return <RecomposicaoCusto />;
    case 'custos-fixos':
      return <CustosFixos />;
    case 'insumos':
      return <Insumos />;
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
        <div className="flex min-h-screen bg-[var(--surface-0)]">
          <Sidebar active={tab} onChange={setTab} />
          <main className="min-w-0 flex-1 overflow-y-auto">
            <Conteudo tab={tab} />
          </main>
        </div>
      </AppDataProvider>
    </ThemeProvider>
  );
}

export default App;
