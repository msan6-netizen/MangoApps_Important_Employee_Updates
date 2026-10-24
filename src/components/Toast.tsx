import { useEffect } from 'react';

export function Toast({ message, onClose }: { message: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-4 z-20 mx-auto w-fit max-w-[90vw] rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
      {message}
    </div>
  );
}
