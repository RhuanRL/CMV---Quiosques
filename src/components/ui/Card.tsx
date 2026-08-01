import type { PropsWithChildren, ReactNode } from 'react';

interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}

export function Card({ title, subtitle, className = '', children }: PropsWithChildren<CardProps>) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)] transition-shadow duration-200 ${className}`}
    >
      {title && <h3 className="text-sm font-medium text-[var(--text-secondary)]">{title}</h3>}
      {subtitle && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>}
      {children}
    </div>
  );
}
