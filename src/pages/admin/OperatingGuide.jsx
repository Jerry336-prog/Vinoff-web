import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Search, Printer, ArrowUpRight } from 'lucide-react';
import { adminGuideContent } from './adminGuideContent';
import DocumentWatermark from '../../components/ui/DocumentWatermark';
import { useBusiness } from '../../context/BusinessContext';

export default function OperatingGuide() {
  const { businessInfo } = useBusiness();
  const [search, setSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const query = search.trim().toLowerCase();
  const sections = adminGuideContent.filter(section =>
    [section.title, section.purpose, ...section.steps, section.note].join(' ').toLowerCase().includes(query),
  );

  return (
    <article className="admin-operating-guide mx-auto flex max-w-6xl flex-col gap-4 lg:h-full lg:min-h-0 print:block print:h-auto">
      <DocumentWatermark text={businessInfo?.watermarkText} printOnly repeatOnPrint />
      <header className="shrink-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 print:mb-6 print:border-0 print:p-0">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="max-w-2xl">
            <p className="mb-1.5 flex items-center gap-2 text-[11px] font-medium text-slate-500"><BookOpen className="h-3.5 w-3.5 text-brand-green-700" aria-hidden="true" /> Vinoff Staff Handbook</p>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Admin Operating Guide</h1>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">How to use every admin tab and manage everyday store operations.</p>
          </div>
          <button type="button" onClick={() => window.print()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-600 print:hidden"><Printer className="h-4 w-4" aria-hidden="true" /> Print / Save as PDF</button>
        </div>
        <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div className="relative w-full sm:max-w-md">
            <label htmlFor="guide-search" className="sr-only">Find a tab or task</label>
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input id="guide-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search a tab or task..." className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 outline-none focus:border-brand-green-500 focus:bg-white focus:ring-1 focus:ring-brand-green-500" />
          </div>
          <p className="text-[11px] text-slate-500" role="status">{sections.length} of {adminGuideContent.length} topics · Full guide included when printing</p>
        </div>
      </header>

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[240px_minmax(0,1fr)] lg:overflow-hidden print:block print:overflow-visible">
        <nav aria-label="Guide contents" className="flex flex-col rounded-2xl border border-slate-200 bg-white p-3 lg:min-h-0 lg:overflow-hidden print:hidden">
          <h2 className="mb-2 shrink-0 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Contents</h2>
          <div className="guide-topic-picker lg:hidden">
            <label htmlFor="guide-topic" className="sr-only">Jump to a guide topic</label>
            <select id="guide-topic" disabled={!sections.length} value={sections.some(section => section.id === selectedTopic) ? selectedTopic : ''} onChange={event => {
              const topic = event.target.value;
              setSelectedTopic(topic);
              document.getElementById(`guide-${topic}`)?.scrollIntoView({ block: 'start' });
            }} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-brand-green-500">
              <option value="" disabled>Select a topic</option>
              {sections.map(section => <option key={section.id} value={section.id}>{section.title}</option>)}
            </select>
          </div>
          <ol className="guide-topic-list hidden gap-0.5 lg:grid lg:min-h-0 lg:flex-1" style={{ gridTemplateRows: `repeat(${Math.max(sections.length, 1)}, minmax(0, 1fr))` }}>
            {sections.map(section => <li key={section.id} className="min-h-0"><a href={`#guide-${section.id}`} title={section.title} onClick={() => setSelectedTopic(section.id)} aria-current={selectedTopic === section.id ? 'location' : undefined} className={`flex h-full min-h-0 items-center rounded-md border-l-2 px-2 text-[11px] font-medium leading-tight transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green-600 ${selectedTopic === section.id ? 'border-brand-green-600 bg-brand-green-50 text-brand-green-800' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><span className="truncate">{section.title}</span></a></li>)}
          </ol>
          {sections.length === 0 && <p className="px-2 py-3 text-xs text-slate-500">No matching topics.</p>}
        </nav>
        <div role="region" aria-label="Operating guide content" tabIndex={0} className="min-w-0 rounded-2xl border border-slate-200 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green-600 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain print:overflow-visible print:rounded-none print:border-0">
          {sections.length === 0 && <p className="p-6 text-sm text-slate-600 print:hidden">No topics match your search. Try a tab name or clear the search to see the full guide.</p>}
          {adminGuideContent.map(section => (
            <section key={section.id} id={`guide-${section.id}`} className={`${sections.includes(section) ? '' : 'hidden print:block'} scroll-mt-0 border-b border-slate-100 p-5 sm:p-6 print:mb-6 print:border-0 print:p-0`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-base font-semibold tracking-tight text-slate-900">{section.title}</h2>
                <Link to={section.path} className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-green-700 hover:underline print:hidden">Open tab <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{section.purpose}</p>
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-700">{section.steps.map(step => <li key={step} className="pl-1">{step}</li>)}</ol>
              <p className="mt-4 border-l-2 border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600 print:bg-white"><strong className="font-semibold text-slate-700">Remember: </strong>{section.note}</p>
              {section.links && <div className="mt-3 flex flex-wrap gap-3 print:hidden">{section.links.map(link => <Link key={link.path} className="text-xs font-bold text-brand-green-700 hover:underline" to={link.path}>{link.label}</Link>)}</div>}
            </section>
          ))}
          <footer className="p-5 text-[11px] leading-relaxed text-slate-500 sm:p-6">Edition: 22 October 2026. For authorised admin staff. Available actions depend on your role and the record status. Recheck the guide when the store workflow changes.</footer>
        </div>
      </div>
    </article>
  );
}
