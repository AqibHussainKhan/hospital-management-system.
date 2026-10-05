import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft, ArrowUpRight, Bookmark, CalendarDays, Check, CheckCircle2,
  Clock3, FlaskConical, Newspaper, Search, Stethoscope, UserRound, X,
} from "lucide-react";

import {
  filterNews, formatNewsDate, hospitalNews, newestNews,
  readingMinutes, storedNewsIds,
} from "../../data/hospitalNews";
import type { HospitalNewsItem } from "../../data/hospitalNews";

interface HospitalNewsProps {
  items?: HospitalNewsItem[];
}

function loadIds(key: string): Set<string> {
  try {
    return storedNewsIds(JSON.parse(window.localStorage.getItem(key) || "[]"));
  } catch {
    return new Set();
  }
}

function useStoredIds(key: string) {
  const [ids, setIds] = useState<Set<string>>(() => loadIds(key));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify([...ids]));
    } catch {
      // Keep session state usable when browser storage is unavailable.
    }
  }, [ids, key]);

  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key === key || event.key === null) setIds(loadIds(key));
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [key]);

  return [ids, setIds] as const;
}

function NewsCover({ item, large = false }: { item: HospitalNewsItem; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const Icon = item.category === "Medical Team"
    ? Stethoscope : item.category === "Patient Care" ? CalendarDays : FlaskConical;

  useEffect(() => setFailed(false), [item.image]);

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-blue-600/20 via-cyan-500/10 to-[var(--hms-surface-secondary)] ${large ? "h-[220px] sm:h-[320px]" : "h-[190px] sm:h-[210px]"}`}>
      {item.image && !failed ? (
        <img
          src={item.image}
          alt={item.imageAlt}
          loading={large ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-blue-500">
          <Icon size={large ? 70 : 54} strokeWidth={1.2} />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
      <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-slate-950/70 px-3 py-1.5 text-[10px] font-semibold text-blue-100 backdrop-blur-md">
        {item.category}
      </span>
    </div>
  );
}

function SaveButton({ saved, onClick, title, overlay = false }: {
  saved: boolean; onClick: () => void; title: string; overlay?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={`${saved ? "Unsave" : "Save"} ${title}`}
      aria-pressed={saved}
      title={saved ? "Remove from saved news" : "Save this news"}
      onClick={onClick}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${saved ? "border-blue-500/30 bg-blue-600 text-white" : overlay ? "border-white/20 bg-slate-950/65 text-white backdrop-blur-md hover:bg-blue-600" : "border-[var(--hms-border)] bg-[var(--hms-surface-secondary)] text-[var(--hms-text-secondary)] hover:text-blue-500"}`}
    >
      <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

function NewsCard({ item, saved, read, onOpen, onSave, index, reducedMotion }: {
  item: HospitalNewsItem; saved: boolean; read: boolean;
  onOpen: () => void; onSave: () => void; index: number; reducedMotion: boolean;
}) {
  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: reducedMotion ? 0 : 0.35, delay: Math.min(index * 0.05, 0.2) }}
      whileHover={reducedMotion ? undefined : { y: -4 }}
      className="hms-card group flex h-full min-w-0 flex-col overflow-hidden rounded-[24px] border border-[var(--hms-border)] transition-shadow hover:shadow-lg"
    >
      <div className="relative">
        <button type="button" onClick={onOpen} aria-label={`Read ${item.title}`} className="block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
          <NewsCover item={item} />
        </button>
        <div className="absolute right-4 top-4">
          <SaveButton saved={saved} onClick={onSave} title={item.title} overlay />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--hms-text-muted)]">
          <span className="flex items-center gap-2">
            <CalendarDays size={13} />
            <time dateTime={item.publishedAt}>{formatNewsDate(item.publishedAt)}</time>
          </span>
          {read && <span className="flex items-center gap-1 text-emerald-500"><Check size={12} />Read</span>}
        </div>
        <h3 className="text-[15px] font-semibold leading-relaxed tracking-tight text-[var(--hms-text)]">
          <button type="button" onClick={onOpen} className="text-left transition hover:text-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
            {item.title}
          </button>
        </h3>
        <p className="mt-3 text-[11px] leading-7 text-[var(--hms-text-muted)]">{item.summary}</p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <button type="button" onClick={onOpen} className="inline-flex items-center gap-2 text-[12px] font-semibold text-blue-500 transition hover:text-blue-400">
            Read more <ArrowUpRight size={14} />
          </button>
          <span className="flex items-center gap-1.5 text-[10px] text-[var(--hms-text-muted)]"><Clock3 size={12} />{readingMinutes(item)} min read</span>
        </div>
      </div>
    </motion.article>
  );
}

function NewsDialog({ children, onClose, viewKey, label }: {
  children: ReactNode; onClose: () => void; viewKey: string; label: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [viewKey]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}
      className="m-auto max-h-[90dvh] w-[min(1100px,calc(100vw-24px))] overflow-hidden rounded-[28px] border border-[var(--hms-border)] bg-[var(--hms-surface)] p-0 text-[var(--hms-text)] shadow-2xl backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[90dvh] flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--hms-border)] px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-blue-500/10 p-2.5 text-blue-500"><Newspaper size={18} /></span>
            <div>
              <p className="text-sm font-semibold">Hospital Newsroom</p>
              <p className="mt-0.5 text-[10px] text-[var(--hms-text-muted)]">Announcements & department updates</p>
            </div>
          </div>
          <button autoFocus type="button" onClick={onClose} aria-label="Close hospital news" className="rounded-xl p-2.5 text-[var(--hms-text-muted)] transition hover:bg-[var(--hms-surface-secondary)] hover:text-[var(--hms-text)]"><X size={19} /></button>
        </header>
        <div ref={contentRef} className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-7">
          {children}
        </div>
      </div>
    </dialog>
  );
}

function ArticleReader({ item, saved, onSave, onBack, onOpen, onNavigate, related }: {
  item: HospitalNewsItem; saved: boolean; onSave: () => void; onBack: () => void;
  onOpen: (id: string) => void; onNavigate: (path: string) => void; related: HospitalNewsItem[];
}) {
  const action = item.action;
  return (
    <article>
      <div className="mb-5 flex items-center justify-between gap-4">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-xs font-medium text-[var(--hms-text-secondary)] transition hover:text-blue-500"><ArrowLeft size={15} />All news</button>
        <div className="flex items-center gap-2"><span className="text-[10px] text-[var(--hms-text-muted)]">{saved ? "Saved" : "Save for later"}</span><SaveButton saved={saved} onClick={onSave} title={item.title} /></div>
      </div>

      <div className="overflow-hidden rounded-[22px]">
        <NewsCover key={item.id} item={item} large />
      </div>
      {item.imageCredit && <p className="mt-2 text-right text-[9px] text-[var(--hms-text-muted)]">Photo: <a href={item.imageCredit.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500">{item.imageCredit.name}</a></p>}

      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[var(--hms-text-muted)]">
            <span className="flex items-center gap-1.5"><CalendarDays size={13} /><time dateTime={item.publishedAt}>{formatNewsDate(item.publishedAt)}</time></span>
            <span className="flex items-center gap-1.5"><Clock3 size={13} />{readingMinutes(item)} min read</span>
            <span className="flex items-center gap-1.5"><UserRound size={13} />{item.author}</span>
          </div>
          <h1 className="text-2xl font-semibold leading-snug tracking-tight sm:text-[30px]">{item.title}</h1>
          <p className="mt-5 border-l-2 border-blue-500 pl-4 text-sm leading-7 text-[var(--hms-text-secondary)]">{item.summary}</p>

          {item.isDemo && <p className="mt-5 rounded-xl border border-[var(--hms-border)] bg-[var(--hms-surface-secondary)] px-4 py-3 text-[11px] leading-5 text-[var(--hms-text-muted)]">Preview announcement · This is sample article content for the website preview.</p>}

          <div className="mt-7 space-y-7">
            {item.sections.map((section, index) => (
              <section key={`${item.id}-${index}`}>
                <h2 className="text-base font-semibold tracking-tight">{section.heading}</h2>
                <div className="mt-3 space-y-3">
                  {section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex} className="text-[13px] leading-7 text-[var(--hms-text-secondary)]">{paragraph}</p>)}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-2 border-t border-[var(--hms-border)] pt-5">
            {item.tags.map((tag) => <span key={tag} className="rounded-full bg-[var(--hms-surface-secondary)] px-3 py-1.5 text-[10px] text-[var(--hms-text-muted)]">#{tag}</span>)}
          </div>
        </div>

        <aside className="space-y-4 self-start lg:sticky lg:top-0">
          <section className="rounded-[20px] border border-[var(--hms-border)] bg-[var(--hms-surface-secondary)] p-5">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-500">At a glance</p>
            <dl className="space-y-4 text-xs">
              <div><dt className="text-[10px] text-[var(--hms-text-muted)]">Department</dt><dd className="mt-1 font-medium">{item.department}</dd></div>
              <div><dt className="text-[10px] text-[var(--hms-text-muted)]">Published</dt><dd className="mt-1 font-medium">{formatNewsDate(item.publishedAt)}</dd></div>
            </dl>
            {action && <button type="button" onClick={() => onNavigate(action.path)} className="mt-5 flex w-full items-center justify-between gap-2 rounded-xl bg-blue-600 px-3 py-3 text-[11px] font-semibold text-white transition hover:bg-blue-500">{action.label}<ArrowUpRight size={14} /></button>}
          </section>

          {item.highlights.length > 0 && <section className="rounded-[20px] border border-[var(--hms-border)] p-5">
            <h2 className="text-xs font-semibold">Key highlights</h2>
            <ul className="mt-4 space-y-3">
              {item.highlights.map((highlight) => <li key={highlight} className="flex items-start gap-2 text-[11px] leading-5 text-[var(--hms-text-secondary)]"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />{highlight}</li>)}
            </ul>
          </section>}
        </aside>
      </div>

      {related.length > 0 && <section className="mt-9 border-t border-[var(--hms-border)] pt-6">
        <h2 className="mb-4 text-sm font-semibold">More hospital updates</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {related.map((article) => <button key={article.id} type="button" onClick={() => onOpen(article.id)} className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--hms-border)] bg-[var(--hms-surface-secondary)] p-4 text-left transition hover:border-blue-500/30"><div><p className="mb-2 text-[9px] font-semibold uppercase tracking-wide text-blue-500">{article.category}</p><p className="text-xs font-medium leading-6">{article.title}</p></div><ArrowUpRight size={16} className="shrink-0 text-blue-500" /></button>)}
        </div>
      </section>}
    </article>
  );
}

export default function HospitalNews({ items = hospitalNews }: HospitalNewsProps) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view = params.get("hospital-news") || "";
  const [savedIds, setSavedIds] = useStoredIds("hms-news-bookmarks-v1");
  const [readIds, setReadIds] = useStoredIds("hms-news-read-v1");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [oldestFirst, setOldestFirst] = useState(false);
  const reducedMotion = Boolean(useReducedMotion());

  const sorted = useMemo(() => newestNews(items), [items]);
  const categories = useMemo(() => [...new Set(items.map((item) => item.category))], [items]);
  const filtered = useMemo(() => filterNews(items, { query, category, savedOnly, savedIds, oldestFirst }), [items, query, category, savedOnly, savedIds, oldestFirst]);
  const selected = sorted.find((item) => item.id === view);
  const selectedId = selected?.id;
  const savedCount = items.filter((item) => savedIds.has(item.id)).length;

  useEffect(() => {
    if (!selectedId) return;
    setReadIds((current) => current.has(selectedId) ? current : new Set([...current, selectedId]));
  }, [selectedId, setReadIds]);

  function show(id: string) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("hospital-news", id);
      return next;
    }, { replace: Boolean(view), preventScrollReset: true });
  }

  function close() {
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("hospital-news");
      return next;
    }, { replace: true, preventScrollReset: true });
  }

  function toggleSaved(id: string) {
    setSavedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function resetFilters() {
    setQuery(""); setCategory(""); setSavedOnly(false); setOldestFirst(false);
  }

  function renderCard(item: HospitalNewsItem, index: number) {
    return <NewsCard key={item.id} item={item} index={index} saved={savedIds.has(item.id)} read={readIds.has(item.id)} onOpen={() => show(item.id)} onSave={() => toggleSaved(item.id)} reducedMotion={reducedMotion} />;
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-blue-500"><Newspaper size={15} /><span className="text-[9px] font-bold uppercase tracking-[0.16em]">News & updates</span></div>
          <h2 className="text-[18px] font-semibold tracking-tight text-[var(--hms-text)]">Hospital News</h2>
          <p className="mt-1 text-[11px] text-[var(--hms-text-muted)]">Demo announcements · Replace with verified hospital updates before publishing.</p>
        </div>
        <button type="button" onClick={() => { resetFilters(); show("all"); }} className="flex items-center gap-2 text-xs font-semibold text-blue-500 transition hover:text-blue-400">All news <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px]">{items.length}</span><ArrowUpRight size={14} /></button>
      </div>

      {sorted.length > 0 ? <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">{sorted.slice(0, 3).map(renderCard)}</div> : <div className="hms-card rounded-[24px] p-8 text-center text-sm text-[var(--hms-text-muted)]">Hospital announcements will appear here when published.</div>}

      {view && <NewsDialog viewKey={view} onClose={close} label={selected?.title || "All hospital news"}>
        {view === "all" ? (
          <section>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-500">News archive</p><h1 className="text-2xl font-semibold tracking-tight">All hospital news</h1><p className="mt-2 text-xs text-[var(--hms-text-muted)]">Browse announcements or return to your saved updates.</p></div>
              <button type="button" aria-pressed={savedOnly} onClick={() => setSavedOnly((current) => !current)} className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-medium transition ${savedOnly ? "border-blue-500/30 bg-blue-500/10 text-blue-500" : "border-[var(--hms-border)] text-[var(--hms-text-secondary)]"}`}><Bookmark size={14} />{savedOnly ? "Showing saved" : "Saved news"}<span>{savedCount}</span></button>
            </div>

            <div className="mb-5 flex flex-col gap-3 sm:flex-row">
              <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[var(--hms-border)] bg-[var(--hms-surface-secondary)] px-4 py-3 text-[var(--hms-text-muted)] focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/10"><Search size={16} className="shrink-0" /><span className="sr-only">Search hospital news</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search news, departments or topics..." className="min-w-0 flex-1 bg-transparent text-xs text-[var(--hms-text)] outline-none placeholder:text-[var(--hms-text-muted)]" /></label>
              <label className="flex items-center gap-2 rounded-xl border border-[var(--hms-border)] bg-[var(--hms-surface-secondary)] px-3 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/10"><span className="sr-only">Sort news</span><select value={oldestFirst ? "oldest" : "latest"} onChange={(event) => setOldestFirst(event.target.value === "oldest")} className="w-full bg-[var(--hms-surface-secondary)] py-3 text-xs text-[var(--hms-text-secondary)] outline-none"><option value="latest">Latest first</option><option value="oldest">Oldest first</option></select></label>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {["", ...categories].map((value) => <button key={value || "all"} type="button" aria-pressed={category === value} onClick={() => setCategory(value)} className={`rounded-full border px-3 py-2 text-[11px] font-medium transition ${category === value ? "border-blue-500/30 bg-blue-500/10 text-blue-500" : "border-[var(--hms-border)] text-[var(--hms-text-muted)] hover:text-[var(--hms-text)]"}`}>{value || "All updates"}</button>)}
            </div>

            <p aria-live="polite" className="mb-4 text-[11px] text-[var(--hms-text-muted)]">{filtered.length} {filtered.length === 1 ? "announcement" : "announcements"}{savedOnly ? " in saved news" : " found"}</p>
            {filtered.length > 0 ? <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map(renderCard)}</div> : <div className="rounded-[22px] border border-dashed border-[var(--hms-border)] p-10 text-center"><Newspaper size={30} className="mx-auto mb-4 text-blue-500" /><h2 className="text-sm font-semibold">{savedOnly ? "No saved updates match" : "No announcements found"}</h2><p className="mt-2 text-xs leading-6 text-[var(--hms-text-muted)]">Try another search or category. Use the bookmark icon to save an update.</p><button type="button" onClick={resetFilters} className="mt-5 text-xs font-semibold text-blue-500">Show all news</button></div>}
          </section>
        ) : selected ? (
          <ArticleReader item={selected} saved={savedIds.has(selected.id)} onSave={() => toggleSaved(selected.id)} onBack={() => show("all")} onOpen={show} onNavigate={(path) => navigate(path)} related={sorted.filter((item) => item.id !== selected.id).sort((a, b) => Number(b.category === selected.category) - Number(a.category === selected.category)).slice(0, 2)} />
        ) : (
          <div className="py-12 text-center"><Newspaper size={32} className="mx-auto mb-4 text-blue-500" /><h1 className="text-lg font-semibold">This announcement is unavailable</h1><p className="mt-3 text-xs text-[var(--hms-text-muted)]">It may have been removed or the link may be incomplete.</p><button type="button" onClick={() => show("all")} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-xs font-semibold text-white">Browse all news</button></div>
        )}
      </NewsDialog>}
    </section>
  );
}
