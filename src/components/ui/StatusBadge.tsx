import type { StatusSemaforo } from '../../types';
import { STATUS_LABEL } from '../../lib/calc';

const STYLES: Record<StatusSemaforo, string> = {
  verde: 'bg-[var(--success-bg)] text-[var(--success-text)]',
  amarelo: 'bg-[var(--warning-bg)] text-[var(--warning-text)]',
  vermelho: 'bg-[var(--danger-bg)] text-[var(--danger-text)]',
};

const DOT: Record<StatusSemaforo, string> = {
  verde: 'bg-[var(--success)]',
  amarelo: 'bg-[var(--warning)]',
  vermelho: 'bg-[var(--danger)]',
};

interface StatusBadgeProps {
  status: StatusSemaforo;
  children?: React.ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status]}`} />
      {children ?? STATUS_LABEL[status]}
    </span>
  );
}
