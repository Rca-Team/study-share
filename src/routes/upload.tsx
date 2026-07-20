import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { MATERIAL_ACCEPT, CLASS_OPTIONS } from "@/lib/studyshare";
import { uploadMaterial } from "@/lib/materials-client";
import { StudyShareLogo } from "@/components/studyshare-logo";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload Study Material — StudyShare" },
      {
        name: "description",
        content: "Drag and drop files to upload notes, PDFs, PPTs, docs, and other study resources.",
      },
      { property: "og:title", content: "Upload Study Material — StudyShare" },
      {
        property: "og:description",
        content: "Share study resources instantly with the StudyShare community.",
      },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [classLevel, setClassLevel] = useState("10");
  const [tags, setTags] = useState("");
  const [uploaderName, setUploaderName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("Waiting for file");
  const [previewUrl, setPreviewUrl] = useState("");

  const acceptedExtensions = useMemo(() => ["pdf", "jpg", "jpeg", "png", "webp", "ppt", "pptx", "doc", "docx", "txt", "zip"], []);
  const previewable = useMemo(() => ["pdf", "jpg", "jpeg", "png", "webp"], []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!previewable.includes(ext)) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, previewable]);

  const validateFile = (candidate: File) => {
    const ext = candidate.name.split(".").pop()?.toLowerCase() || "";
    return acceptedExtensions.includes(ext);
  };

  const onDropFile = (candidate?: File) => {
    if (!candidate) return;
    if (!validateFile(candidate)) {
      setError("Unsupported file type. Use PDF, image, PPT/PPTX, DOC/DOCX, TXT, or ZIP.");
      return;
    }
    setError("");
    setFile(candidate);
    setUploadProgress(0);
    setUploadStage("Ready to upload");
    if (!title) setTitle(candidate.name.replace(/\.[^/.]+$/, ""));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }
    if (!title.trim() || !subject.trim()) {
      setError("Title and subject are required.");
      return;
    }

    setSaving(true);
    setUploadProgress(5);
    setUploadStage("Preparing upload");
    setError("");
    try {
      const id = await uploadMaterial({
        file,
        title: title.trim(),
        description: description.trim(),
        subject: subject.trim(),
        classLevel,
        tagsRaw: tags,
        uploaderName: uploaderName.trim(),
        onProgress: (progress, stage) => {
          setUploadProgress(progress);
          setUploadStage(stage);
        },
      });
      await navigate({ to: "/materials/$id", params: { id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen pb-16">
      <section className="cyber-panel mx-auto mt-6 w-full max-w-6xl p-5 sm:p-7">
        <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <StudyShareLogo compact className="gap-2" iconClassName="h-10 w-10 rounded-xl" />
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
              Drag + Drop Upload
            </span>
            <Link
              to="/"
              className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Back to home
            </Link>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-foreground">Upload study material</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add clean details, see live preview, and track progress clearly while uploading.
        </p>

        <form className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              onDropFile(e.dataTransfer.files?.[0]);
            }}
             className={`grid min-h-40 place-items-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-all ${
              dragActive ? "border-primary bg-accent/50" : "border-border bg-background"
            }`}
          >
            <input
              type="file"
              accept={MATERIAL_ACCEPT}
              className="hidden"
              onChange={(e) => onDropFile(e.target.files?.[0])}
            />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {file ? file.name : "Drop file here or click to select"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">PDF, JPG/PNG/WEBP, PPT/PPTX, DOC/DOCX, TXT, ZIP</p>
            </div>
            </label>

             <div className="glass-panel rounded-xl border border-border bg-background p-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">Upload progress</span>
              <span className="text-muted-foreground">{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{saving ? uploadStage : "Waiting for upload"}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title" required>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Subject" required>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </Field>
            </div>

            <Field label="Description">
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            </Field>

            <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Class">
              <select
                value={classLevel}
                onChange={(e) => setClassLevel(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                {CLASS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tags (comma separated)">
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="physics, notes, revision"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </Field>

            <Field label="Uploader name (optional)">
              <input
                value={uploaderName}
                onChange={(e) => setUploaderName(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </Field>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex flex-wrap gap-2">
              <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-70"
            >
              {saving ? "Uploading..." : "Upload material"}
              </button>
              <button
              type="button"
              onClick={() => navigate({ to: "/" })}
              className="rounded-xl border border-border bg-background px-4 py-2 text-sm"
            >
              Cancel
              </button>
            </div>
          </div>

          <aside className="space-y-3">
             <div className="cyber-panel rounded-xl border border-border bg-background p-3">
              <h2 className="text-sm font-semibold text-foreground">Inline preview</h2>
              <div className="mt-3 grid min-h-64 place-items-center overflow-hidden rounded-xl border border-border bg-muted/35">
                {!file ? (
                  <p className="px-4 text-center text-xs text-muted-foreground">Select a PDF or image to preview here.</p>
                ) : previewUrl && file.name.toLowerCase().endsWith(".pdf") ? (
                  <iframe
                    src={previewUrl}
                    title="PDF upload preview"
                    className="h-[340px] w-full sm:h-[420px]"
                  />
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={`Preview of ${file.name}`}
                    className="h-[340px] w-full object-contain sm:h-[420px]"
                  />
                ) : (
                  <p className="px-4 text-center text-xs text-muted-foreground">
                    Preview not available for this file type.
                  </p>
                )}
              </div>
            </div>

             <div className="glass-panel rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Supported files</p>
              <p className="mt-1">PDF, JPG, PNG, WEBP, PPT, PPTX, DOC, DOCX, TXT, ZIP</p>
            </div>
          </aside>
        </form>
      </section>
    </main>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}
