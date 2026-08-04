import type { PropsWithChildren } from 'react';

interface InfoTermoProps {
  explicacao: string;
}

/** Sublinha um termo técnico (CMV, rateio, etc.) e mostra a explicação ao passar o mouse,
 * sem exigir que quem não é da área financeira precise perguntar o que significa. */
export function InfoTermo({ explicacao, children }: PropsWithChildren<InfoTermoProps>) {
  return (
    <span
      title={explicacao}
      className="cursor-help border-b border-dotted border-[var(--text-muted)] decoration-dotted"
    >
      {children}
    </span>
  );
}
