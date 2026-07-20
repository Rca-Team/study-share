import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  addComment,
  addReport,
  fetchComments,
  fetchMaterialById,
  fetchRelatedMaterials,
  getDownloadUrl,
  incrementMetric,
} from "@/lib/materials-client";
import {
  FILE_TYPE_LABELS,
  formatCount,
  formatFileSize,
  type MaterialRow,
} from "@/lib/studyshare";

export const Route = createFileRoute("/materials/$id")({
  component: MaterialPage,
  errorComponent: MaterialError,
  notFoundComponent: MaterialNotFound,
  head: () => ({
    meta: [
      { title: "Material details — StudyShare" },
      { name: "description", content: "Preview, download, and discuss shared study material." },
      { property: "og:title", content: "Material details — StudyShare" },
      { property: "og:description", content: "View stats, comments, and related resources." },
    ],
  }),
});

function MaterialPage() {
  const { id } = Route.useParams();
  const [material, setMaterial] = useState<MaterialRow | null>(null);
  const [related, setRelated] = useState<MaterialRow[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const current = await fetchMaterialById(id);
        if (!current) throw notFound();

        setMaterial(current);
        const [url, commentsData, relatedData] = await Promise.all([
          getDownloadUrl(current.file_path),
          fetchComments(current.id),
          fetchRelatedMaterials(current),
        ]);
        setDownloadUrl(url);
        setComments(commentsData);
        setRelated(relatedData);
        void incrementMetric(current.id, "views");

        const recentRaw = window.localStorage.getItem("studyshare-recent") || "[]";
        const recent = JSON.parse(recentRaw) as string[];
        const next = [current.id, ...recent.filter((entry) => entry !== current.id)].slice(0, 20);
        window.localStorage.setItem("studyshare-recent", JSON.stringify(next));
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [id]);

  const previewMode = useMemo(() => {
    if (!material) return "other";
    if (material.file_type === "pdf") return "pdf";
    if (["jpg", "jpeg", "png", "webp"].includes(material.file_type)) return "image";
    return "other";
  }, [material]);

  if (loading) {
    return (
      <main className="section-frame py-8">
        <div className="h-96 animate-pulse rounded-xl border border-border bg-muted" />
      </main>
    );
  }

  if (!material) throw notFound();

  const onDownload = async () => {
    await incrementMetric(material.id, "downloads");
    if (!downloadUrl) {
      const url = await getDownloadUrl(material.file_path);
      setDownloadUrl(url);
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  };

  const onLike = async () => {
    await incrementMetric(material.id, "likes");
    setMaterial((prev) => (prev ? { ...prev, likes: prev.likes + 1 } : prev));
  };

  const onCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
  };

  const onShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: material.title,
        text: `Check this study material on StudyShare: ${material.title}`,
        url: window.location.href,
      });
      return;
    }
    await onCopyLink();
  };

  const onComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!commentText.trim()) return;
    await addComment(material.id, commentName.trim() || "Anonymous", commentText.trim());
    setCommentText("");
    setCommentName("");
    setComments(await fetchComments(material.id));
  };

  const onReport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reportReason.trim()) return;
    await addReport(material.id, reportReason.trim(), commentName.trim() || undefined);
    setReportReason("");
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(window.location.href)}`;

  return (
    <main className="section-frame py-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h1 className="text-2xl font-extrabold text-foreground">{material.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{material.description || "No description added"}</p>

          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <Metric label="Type" value={FILE_TYPE_LABELS[material.file_type] ?? material.file_type} />
            <Metric label="Size" value={formatFileSize(material.file_size)} />
            <Metric label="Views" value={formatCount(material.views)} />
            <Metric label="Downloads" value={formatCount(material.downloads)} />
          </div>

          <div className="mt-5 rounded-xl border border-border bg-background p-3">
            {previewMode === "pdf" && downloadUrl ? (
              <iframe
                src={`${downloadUrl}#view=FitH`}
                title="PDF Preview"
                className="h-[520px] w-full rounded-lg border border-border"
              />
            ) : null}

            {previewMode === "image" && downloadUrl ? (
              <img src={downloadUrl} alt={`Preview of ${material.title}`} loading="lazy" className="h-auto max-h-[520px] w-full rounded-lg object-contain" />
            ) : null}

            {previewMode === "other" ? (
              <div className="grid h-52 place-items-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                Preview unavailable for this file type. Download to view.
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => void onDownload()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Download
            </button>
            <button onClick={() => void onLike()} className="rounded-lg border border-border bg-background px-4 py-2 text-sm">
              Like ({formatCount(material.likes)})
            </button>
            <button onClick={() => void onShare()} className="rounded-lg border border-border bg-background px-4 py-2 text-sm">
              Share
            </button>
            <button onClick={() => void onCopyLink()} className="rounded-lg border border-border bg-background px-4 py-2 text-sm">
              Copy link
            </button>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">Material info</h2>
            <dl className="mt-3 space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between gap-2"><dt>Subject</dt><dd className="font-medium text-foreground">{material.subject}</dd></div>
              <div className="flex justify-between gap-2"><dt>Class</dt><dd className="font-medium text-foreground">{material.class_level}</dd></div>
              <div className="flex justify-between gap-2"><dt>Uploaded</dt><dd className="font-medium text-foreground">{new Date(material.created_at).toLocaleDateString()}</dd></div>
              <div className="flex justify-between gap-2"><dt>Uploader</dt><dd className="font-medium text-foreground">{material.uploader_name || "Anonymous"}</dd></div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-1">
              {material.tags.map((tag) => (
                <span key={tag} className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">#{tag}</span>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">QR code</h2>
            <img src={qrUrl} alt="QR code for material page" loading="lazy" className="mx-auto mt-3 h-40 w-40 rounded-lg border border-border bg-background p-2" />
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">Related materials</h2>
            <div className="mt-2 space-y-2">
              {related.map((item) => (
                <Link key={item.id} to="/materials/$id" params={{ id: item.id }} className="block rounded-lg border border-border px-3 py-2 hover:bg-accent">
                  <p className="line-clamp-1 text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.subject} • {formatCount(item.downloads)} downloads</p>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-lg font-semibold text-foreground">Comments</h2>
          <form className="mt-3 space-y-2" onSubmit={onComment}>
            <input
              value={commentName}
              onChange={(e) => setCommentName(e.target.value)}
              placeholder="Your name (optional)"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <textarea
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a helpful comment"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Post comment</button>
          </form>

          <div className="mt-4 space-y-2">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-lg border border-border bg-background px-3 py-2">
                <p className="text-sm font-medium text-foreground">{comment.username}</p>
                <p className="text-sm text-muted-foreground">{comment.comment}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-lg font-semibold text-foreground">Report content</h2>
          <p className="mt-1 text-sm text-muted-foreground">Flag inappropriate or incorrect material.</p>
          <form className="mt-3 space-y-2" onSubmit={onReport}>
            <textarea
              rows={5}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Reason for report"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <button className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
              Submit report
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}

function MaterialNotFound() {
  return (
    <main className="section-frame py-10">
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <h1 className="text-xl font-semibold text-foreground">Material not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This file might have been removed.</p>
        <Link to="/" className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Back to home
        </Link>
      </div>
    </main>
  );
}

function MaterialError({ error }: { error: Error }) {
  return (
    <main className="section-frame py-10">
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
        <h1 className="text-xl font-semibold text-foreground">Could not load material</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
