import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchMaterials,
  type MaterialSort,
} from "@/lib/materials-client";
import {
  FILE_TYPE_LABELS,
  formatCount,
  formatFileSize,
  type MaterialRow,
} from "@/lib/studyshare";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudyShare — Browse Free Study Materials" },
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
  const [sort, setSort] = useState<MaterialSort>("latest");
  const [subject, setSubject] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [fileType, setFileType] = useState("");
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("studyshare-theme");
    const shouldDark = saved === "dark";
    setDarkMode(shouldDark);
    document.documentElement.classList.toggle("dark", shouldDark);
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
        sort,
        subject: subject || undefined,
        classLevel: classLevel || undefined,
        fileType: fileType || undefined,
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
    void load(0, true);
  }, [query, sort, subject, classLevel, fileType]);

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
  }, [page, hasMore, loading, query, sort, subject, classLevel, fileType]);

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
      <div className="section-frame pt-6 sm:pt-8">
        <header className="glass-panel grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl p-3 sm:flex sm:justify-between sm:p-4">
          <Link to="/" className="min-w-0 text-xl font-extrabold text-gradient-brand sm:text-2xl">
            StudyShare
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-accent sm:text-sm"
            >
              {darkMode ? "Light" : "Dark"}
            </button>
            <Link
              to="/admin"
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-accent sm:text-sm"
            >
              Admin
            </Link>
            <Link
              to="/upload"
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 sm:text-sm"
            >
              Quick Upload
            </Link>
          </div>
        </header>

        <section className="mt-6 grid gap-4 rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm sm:p-8">
          <h1 className="text-balance text-3xl font-extrabold text-foreground sm:text-4xl">
            Community study materials, open for everyone.
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
            Upload, search, preview, and download notes, PDFs, slides, and docs without sign in.
          </p>

          <div className="glass-panel grid gap-3 rounded-xl p-3 sm:grid-cols-2 lg:grid-cols-6">
            <label className="lg:col-span-2">
              <span className="sr-only">Search</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, subject, tags, class"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
              />
            </label>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as MaterialSort)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="latest">Latest</option>
              <option value="downloads">Most Downloaded</option>
              <option value="views">Most Viewed</option>
              <option value="az">A–Z</option>
            </select>

            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />

            <input
              value={classLevel}
              onChange={(e) => setClassLevel(e.target.value)}
              placeholder="Class"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />

            <input
              value={fileType}
              onChange={(e) => setFileType(e.target.value.toLowerCase())}
              placeholder="Type (pdf, docx, pptx)"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
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

        <Section title="Popular subjects" subtitle="Most contributed topics">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {popularSubjects.map(([name, count]) => (
              <button
                key={name}
                onClick={() => setSubject(name)}
                className="hover-lift rounded-lg border border-border bg-card px-3 py-2 text-left"
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
    <article className="glass-panel rounded-xl p-4">
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
  children: React.ReactNode;
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
          <div key={i} className="h-44 animate-pulse rounded-xl border border-border bg-muted" />
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
          className="hover-lift animate-fade-in rounded-xl border border-border bg-card p-4"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
              {FILE_TYPE_LABELS[item.file_type] ?? item.file_type.toUpperCase()}
            </span>
            <span className="text-xs text-muted-foreground">{formatFileSize(item.file_size)}</span>
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
