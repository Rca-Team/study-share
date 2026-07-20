import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { StudyShareLogo } from "@/components/studyshare-logo";
import {
  deleteMaterial,
  deleteReport,
  fetchAdminData,
  setMaterialHidden,
  setMaterialPin,
} from "@/lib/materials-client";
import { formatCount, formatFileSize, type MaterialRow } from "@/lib/studyshare";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin panel — StudyShare" },
      { name: "description", content: "Manage uploads, reports, and platform analytics." },
      { property: "og:title", content: "Admin panel — StudyShare" },
      { property: "og:description", content: "Moderate shared materials and review reports." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminData();
      setMaterials(data.materials);
      setReports(data.reports);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const analytics = useMemo(() => {
    const storageUsage = materials.reduce((sum, item) => sum + item.file_size, 0);
    const totalViews = materials.reduce((sum, item) => sum + item.views, 0);
    const totalDownloads = materials.reduce((sum, item) => sum + item.downloads, 0);
    return {
      storageUsage,
      totalViews,
      totalDownloads,
      pinned: materials.filter((item) => item.is_pinned).length,
      hidden: materials.filter((item) => item.is_hidden).length,
    };
  }, [materials]);

  return (
    <main className="min-h-screen pb-16">
      <section className="cyber-panel mt-6 p-5 sm:p-7">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <StudyShareLogo compact className="gap-2" iconClassName="h-10 w-10 rounded-xl" />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-extrabold text-foreground">StudyShare admin</h1>
              <p className="mt-1 text-sm text-muted-foreground">Manage uploads, reports, pins, and storage usage.</p>
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Tile label="Uploads" value={formatCount(materials.length)} />
          <Tile label="Reports" value={formatCount(reports.length)} />
          <Tile label="Views" value={formatCount(analytics.totalViews)} />
          <Tile label="Downloads" value={formatCount(analytics.totalDownloads)} />
          <Tile label="Storage" value={formatFileSize(analytics.storageUsage)} />
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <article className="cyber-panel rounded-xl p-4">
          <h2 className="text-lg font-semibold text-foreground">Manage uploads</h2>
          {loading ? <div className="mt-3 h-56 animate-pulse rounded-lg bg-muted" /> : null}

          <div className="mt-3 space-y-2">
            {materials.map((item) => (
               <div key={item.id} className="glass-panel hover-lift grid gap-3 rounded-xl border border-border bg-background p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.subject} • Class {item.class_level} • {formatFileSize(item.file_size)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={async () => {
                      await setMaterialPin(item.id, !item.is_pinned);
                      await load();
                    }}
                    className="rounded-lg border border-border px-3 py-1 text-xs hover:bg-accent"
                  >
                    {item.is_pinned ? "Unpin" : "Pin"}
                  </button>
                  <button
                    onClick={async () => {
                      await setMaterialHidden(item.id, !item.is_hidden);
                      await load();
                    }}
                    className="rounded-lg border border-border px-3 py-1 text-xs hover:bg-accent"
                  >
                    {item.is_hidden ? "Unhide" : "Hide"}
                  </button>
                  <button
                    onClick={async () => {
                      await deleteMaterial(item.id, item.file_path);
                      await load();
                    }}
                    className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs text-destructive"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
          </article>

           <article className="cyber-panel rounded-xl p-4">
          <h2 className="text-lg font-semibold text-foreground">Reports queue</h2>
          <div className="mt-3 space-y-2">
            {reports.map((report) => (
               <div key={report.id} className="glass-panel rounded-xl border border-border bg-background p-3">
                <p className="text-sm font-semibold text-foreground">{report.materials?.title || "Deleted material"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{report.reason}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{new Date(report.created_at).toLocaleString()}</p>
                <button
                  onClick={async () => {
                    await deleteReport(report.id);
                    await load();
                  }}
                  className="mt-2 rounded-lg border border-border px-3 py-1 text-xs hover:bg-accent"
                >
                  Mark resolved
                </button>
              </div>
            ))}
          </div>
          </article>
        </section>
      </section>
    </main>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel rounded-2xl p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
