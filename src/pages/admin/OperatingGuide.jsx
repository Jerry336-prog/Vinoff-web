import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Search, Printer, ArrowUpRight } from 'lucide-react';
import { adminGuideContent } from './adminGuideContent';

export default function OperatingGuide() {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const sections = adminGuideContent.filter(section =>
    [section.title, section.purpose, ...section.steps, section.note].join(' ').toLowerCase().includes(query),
  );

  return (
    <article className="admin-operating-guide mx-auto max-w-6xl space-y-6">
      <header className="rounded-3xl border border-brand-green-800 bg-brand-green-950 p-6 text-white sm:p-8 print:border-0 print:bg-white print:p-0 print:text-black">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="max-w-2xl">
            <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-green-200 print:text-black"><BookOpen className="h-4 w-4" aria-hidden="true" /> Vinoff Staff Handbook</p>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Admin Operating Guide</h1>
            <p className="mt-3 text-sm leading-relaxed text-brand-green-100 print:text-black">Your practical reference for running the store: what each tab does, how to complete everyday tasks, and what to check before changing a record.</p>
            <p className="mt-4 text-xs text-brand-green-200 print:text-black">Edition: 22 October 2026 · For authorised admin staff</p>
          </div>
          <button type="button" onClick={() => window.print()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-yellow-400 px-4 py-3 text-xs font-extrabold text-slate-950 hover:bg-brand-yellow-300 print:hidden"><Printer className="h-4 w-4" aria-hidden="true" /> Print / Save as PDF</button>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 print:hidden">
        <label htmlFor="guide-search" className="mb-2 block text-xs font-bold text-slate-700">Find a tab or task</label>
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" /><input id="guide-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Try Paystack, restock, credit, delivery or settings..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-brand-green-500" /></div>
        <p className="mt-2 text-xs text-slate-500" role="status">{sections.length} of {adminGuideContent.length} topics shown. Printing includes the complete guide.</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)] print:block">
        <nav aria-label="Guide contents" className="rounded-2xl border border-slate-200 bg-white p-4 print:hidden">
          <h2 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">Contents</h2>
          <ol className="space-y-1">{sections.map(section => <li key={section.id}><a href={`#guide-${section.id}`} className="block rounded-lg px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-brand-green-50 hover:text-brand-green-800">{section.title}</a></li>)}</ol>
        </nav>
        <div className="min-w-0 space-y-5">
          {sections.length === 0 && <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 print:hidden">No topics match your search. Try a tab name or clear the search to see the full guide.</p>}
          {adminGuideContent.map(section => (
            <section key={section.id} id={`guide-${section.id}`} className={`${sections.includes(section) ? '' : 'hidden print:block'} scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 print:mb-6 print:rounded-none print:border-0 print:p-0`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{section.title}</h2>
                <Link to={section.path} className="inline-flex items-center gap-1 text-xs font-bold text-brand-green-700 hover:underline print:hidden">Open tab <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{section.purpose}</p>
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-700">{section.steps.map(step => <li key={step} className="pl-1">{step}</li>)}</ol>
              <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950 print:border-slate-200 print:bg-white"><strong>Remember: </strong>{section.note}</p>
              {section.links && <div className="mt-3 flex flex-wrap gap-3 print:hidden">{section.links.map(link => <Link key={link.path} className="text-xs font-bold text-brand-green-700 hover:underline" to={link.path}>{link.label}</Link>)}</div>}
            </section>
          ))}
        </div>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">This guide describes the current management suite. Buttons and permissions can depend on your role and the record status. Recheck the guide when the store workflow changes.</p>
    </article>
  );
}
