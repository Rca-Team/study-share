import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { StudyShareLogo } from "@/components/studyshare-logo";
import {
  fetchMaterials,
  fetchMaterialsForAiSearch,
} from "@/lib/materials-client";
import { rankMaterialsByAi } from "@/lib/material-search.functions";
import {
  FILE_TYPE_LABELS,
  formatCount,
  formatFileSize,
  type MaterialRow,
} from "@/lib/studyshare";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudyShare • Made by Gaurav" },
      {
        name: "description",
        content:
          "Search, preview, and download free community study resources for school, competitive exams, and college.",
      },
      { property: "og:title", content: "StudyShare — Browse Free Study Materials" },
      {
        property: "og:description",
        content: "Find trending notes, slides, and PDFs by subject, class level, and file type.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [query, setQuery] = useState("");
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [recentViewedIds, setRecentViewedIds] = useState<string[]>([]);
  const [aiReason, setAiReason] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const rankByAi = useServerFn(rankMaterialsByAi);

  useEffect(() => {
    const saved = window.localStorage.getItem("studyshare-theme");
    const shouldDark = saved === "dark";
    setDarkMode(shouldDark);
    document.documentElement.classList.toggle("dark", shouldDark);

    const recentRaw = window.localStorage.getItem("studyshare-recent") || "[]";
    const recent = JSON.parse(recentRaw) as string[];
    setRecentViewedIds(recent);
  }, []);

  const toggleTheme = () => {
    setDarkMode((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      window.localStorage.setItem("studyshare-theme", next ? "dark" : "light");
      return next;
    });
  };

  const load = async (nextPage: number, reset = false) => {
    setLoading(true);
    try {
      const result = await fetchMaterials({
        q: query,
        page: nextPage,
        pageSize: 12,
      });

      setTotalCount(result.count);
      setHasMore(result.hasMore);
      setPage(nextPage);
      setMaterials((prev) => (reset ? result.items : [...prev, ...result.items]));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const runSearch = async () => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        setAiReason("");
        await load(0, true);
        return;
      }

      setLoading(true);
      try {
        const candidates = await fetchMaterialsForAiSearch({
          subject: undefined,
          classLevel: undefined,
          fileType: undefined,
        });

        if (!candidates.length) {
          if (!isCancelled) {
            setMaterials([]);
            setTotalCount(0);
            setPage(0);
            setHasMore(false);
            setAiReason("No matching materials found.");
          }
          return;
        }

        const ranking = await rankByAi({
          data: {
            query: trimmedQuery,
            candidates: candidates.map((item) => ({
              id: item.id,
              title: item.title,
              description: item.description,
              subject: item.subject,
              classLevel: item.class_level,
              tags: item.tags,
              fileType: item.file_type,
              downloads: item.downloads,
              views: item.views,
              createdAt: item.created_at,
            })),
          },
        });

        const byId = new Map(candidates.map((item) => [item.id, item]));
        const ordered = ranking.rankedIds.map((id) => byId.get(id)).filter(Boolean) as MaterialRow[];

        if (!isCancelled) {
          setMaterials(ordered);
          setTotalCount(ordered.length);
          setPage(0);
          setHasMore(false);
          setAiReason(ranking.reason || "AI semantic ranking applied.");
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    void runSearch();
    return () => {
      isCancelled = true;
    };
  }, [query]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || loading) return;

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry?.isIntersecting && hasMore && !loading) {
        void load(page + 1);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [page, hasMore, loading, query]);

  const trending = useMemo(
    () => [...materials].sort((a, b) => b.views + b.downloads - (a.views + a.downloads)).slice(0, 6),
    [materials],
  );

  const recent = useMemo(
    () => [...materials].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 6),
    [materials],
  );

  const mostDownloaded = useMemo(
    () => [...materials].sort((a, b) => b.downloads - a.downloads).slice(0, 6),
    [materials],
  );

  const popularSubjects = useMemo(() => {
    const bySubject = new Map<string, number>();
    for (const material of materials) {
      bySubject.set(material.subject, (bySubject.get(material.subject) ?? 0) + 1);
    }
    return Array.from(bySubject.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [materials]);

  const recentlyViewed = useMemo(() => {
    const byId = new Map(materials.map((item) => [item.id, item]));
    return recentViewedIds.map((id) => byId.get(id)).filter(Boolean) as MaterialRow[];
  }, [materials, recentViewedIds]);

  const totals = useMemo(
    () =>
      materials.reduce(
        (acc, item) => {
          acc.downloads += item.downloads;
          acc.views += item.views;
          return acc;
        },
        { downloads: 0, views: 0 },
      ),
    [materials],
  );

  const recentTicker = useMemo(() => recent.map((item) => item.title).join(" • "), [recent]);

  return (
    <main className="min-h-screen pb-20">
      <div className="section-frame relative mt-6 overflow-hidden pt-6 sm:pt-8">
        <div className="pointer-events-none absolute -left-20 -top-16 h-72 w-72 rounded-full bg-brand-pink/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 top-14 h-72 w-72 rounded-full bg-brand-aqua/25 blur-3xl" />

        <header className="glass-panel grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl p-3 sm:flex sm:justify-between sm:p-4">
          <Link to="/" className="min-w-0">
            <StudyShareLogo compact className="gap-2" iconClassName="h-9 w-9 rounded-xl" />
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-accent sm:text-sm"
            >
              {darkMode ? "Light" : "Dark"}
            </button>
            <Link
              to="/about"
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-accent sm:text-sm"
            >
              About
            </Link>
            <Link
              to="/admin"
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-accent sm:text-sm"
            >
              Admin
            </Link>
            <Link
              to="/upload"
              className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 sm:text-sm"
            >
              Quick Upload
            </Link>
          </div>
        </header>

        <section className="relative mt-6 grid gap-4 rounded-3xl border border-border/70 bg-card/85 p-6 shadow-sm sm:p-10">
          <div className="mx-auto flex justify-center">
            <StudyShareLogo className="flex-col gap-4 text-center" iconClassName="h-16 w-16" />
          </div>
          <h1 className="mx-auto max-w-4xl text-balance text-center text-4xl font-extrabold text-foreground sm:text-5xl">
            Master your subjects with shared knowledge.
          </h1>
          <p className="mx-auto max-w-2xl text-center text-base text-muted-foreground sm:text-lg">
            Search, preview, upload, and download quality student resources instantly — no sign in required.
          </p>

          <div className="glass-panel mx-auto w-full max-w-3xl rounded-2xl p-3">
            <label>
              <span className="sr-only">Search</span>
              <div className="group relative overflow-hidden rounded-xl border border-input bg-background/90 transition-all duration-300 focus-within:border-primary focus-within:shadow-lg focus-within:shadow-primary/20">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 transition-opacity duration-500 group-focus-within:opacity-100" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask naturally: 'class 11 trigonometry notes with examples'"
                  className="relative w-full bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
            </label>

            {query.trim() ? (
              <p className="mt-3 rounded-lg border border-border/80 bg-card/90 px-3 py-2 text-xs text-muted-foreground">
                AI Search: {aiReason || "Understanding your query and ranking by relevance..."}
              </p>
            ) : null}
          </div>
        </section>

        <section className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-card/65 px-3 py-2 text-xs text-muted-foreground sm:text-sm">
          <span>Recent uploads:</span>
          <span className="truncate text-foreground">{recentTicker || "No recent materials yet"}</span>
        </section>

         <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Total uploads" value={formatCount(totalCount)} />
          <StatsCard label="Total downloads" value={formatCount(totals.downloads)} />
          <StatsCard label="Total views" value={formatCount(totals.views)} />
          <StatsCard label="Live download counter" value={formatCount(totals.downloads)} />
        </section>

        <Section title="Trending study materials" subtitle="Most active by views and downloads">
          <MaterialGrid items={trending} loading={loading} />
        </Section>

        <Section title="Recently uploaded" subtitle="Newest resources from the community">
          <MaterialGrid items={recent} loading={loading} />
        </Section>

        <Section title="Most downloaded" subtitle="Popular files students save most">
          <MaterialGrid items={mostDownloaded} loading={loading} />
        </Section>

        <Section title="Recently viewed" subtitle="Jump back to what you opened last">
          <MaterialGrid items={recentlyViewed} loading={false} />
        </Section>

        <Section title="Popular subjects" subtitle="Most contributed topics">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {popularSubjects.map(([name, count]) => (
              <button
                key={name}
                onClick={() => setQuery(name)}
                className="hover-lift rounded-xl border border-border bg-card/90 px-3 py-2 text-left"
              >
                <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                <p className="text-xs text-muted-foreground">{count} files</p>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Browse all materials" subtitle="Infinite scrolling list with lazy cards">
          <MaterialGrid items={materials} loading={loading && materials.length === 0} />
          <div ref={sentinelRef} className="h-10" />
          {hasMore && !loading && (
            <button
              onClick={() => void load(page + 1)}
              className="mt-4 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Load more
            </button>
          )}
        </Section>
      </div>
    </main>
  );
}

function StatsCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="glass-panel rounded-2xl p-4 hover-lift">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </article>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8">
      <header className="mb-4">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </header>
      {children}
    </section>
  );
}

function MaterialGrid({ items, loading }: { items: MaterialRow[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton-shimmer h-52 rounded-2xl border border-border bg-muted" />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
        No materials found for your current filters.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Link
          key={item.id}
          to="/materials/$id"
          params={{ id: item.id }}
          className="hover-lift animate-fade-in rounded-2xl border border-border bg-card/90 p-4"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="rounded-lg bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
              {FILE_TYPE_LABELS[item.file_type] ?? item.file_type.toUpperCase()}
            </span>
            <span className="text-xs text-muted-foreground">{formatFileSize(item.file_size)}</span>
          </div>

          <div className="mb-3 grid h-32 place-items-center overflow-hidden rounded-2xl border border-border bg-background/70">
            {item.thumbnail_url ? (
              <img
                src={item.thumbnail_url}
                alt={`${item.title} preview`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <p className="px-3 text-center text-xs text-muted-foreground">Preview unavailable</p>
            )}
          </div>

          <h3 className="line-clamp-2 text-base font-semibold text-foreground">{item.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {item.description || `${item.subject} • Class ${item.class_level}`}
          </p>

          <div className="mt-3 flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md bg-muted/70 p-2">
              <p className="text-muted-foreground">Views</p>
              <p className="font-semibold text-foreground">{formatCount(item.views)}</p>
            </div>
            <div className="rounded-md bg-muted/70 p-2">
              <p className="text-muted-foreground">Downloads</p>
              <p className="font-semibold text-foreground">{formatCount(item.downloads)}</p>
            </div>
            <div className="rounded-md bg-muted/70 p-2">
              <p className="text-muted-foreground">Likes</p>
              <p className="font-semibold text-foreground">{formatCount(item.likes)}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
