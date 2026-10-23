import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function AppDialog({ title, children, onClose, busy = false }) {
  const dialog = useRef(null);
  const titleId = useId();
  const close = () => { if (!busy) onClose(); };
  useEffect(() => {
    const node = dialog.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    node.showModal();
    return () => { node.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  return createPortal(<dialog ref={dialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); close(); }} className="m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[85dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-800 shadow-xl backdrop:bg-slate-900/45">
    <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><h2 id={titleId} className="text-base font-semibold">{title}</h2><button type="button" onClick={() => close()} disabled={busy} aria-label="Close dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-40"><X className="h-4 w-4" /></button></header>
    <div className="p-5">{children}</div>
  </dialog>, document.body);
}
