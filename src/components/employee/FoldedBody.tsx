import { useState } from 'react';

/** "Read full post ▾" toggle; the body stays folded until tapped. */
export function FoldedBody({ body }: { body: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button className="text-sm font-medium text-slate-600 underline-offset-2 hover:underline" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Hide full post ▴' : 'Read full post ▾'}
      </button>
      {open && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{body}</p>}
    </div>
  );
}
