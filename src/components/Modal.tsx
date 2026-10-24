import type { ReactNode } from 'react';

export function Modal({ title, children, testId }: { title: string; children: ReactNode; testId?: string }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={title} data-testid={testId}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="text-base font-bold">{title}</h2>
        <div className="mt-3 space-y-3 text-sm">{children}</div>
      </div>
    </div>
  );
}
