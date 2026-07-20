import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { MATERIAL_ACCEPT, CLASS_OPTIONS } from "@/lib/studyshare";
import { uploadMaterial } from "@/lib/materials-client";

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

  const acceptedExtensions = useMemo(() => ["pdf", "jpg", "jpeg", "png", "webp", "ppt", "pptx", "doc", "docx", "txt", "zip"], []);

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
      });
      await navigate({ to: "/materials/$id", params: { id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="section-frame py-8">
      <section className="mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card/80 p-5 sm:p-7">
        <h1 className="text-2xl font-extrabold text-foreground">Upload study material</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drag and drop or choose a file, then add details so others can find it quickly.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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
            className={`grid min-h-36 place-items-center rounded-xl border-2 border-dashed px-4 py-6 text-center ${
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
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-70"
            >
              {saving ? "Uploading..." : "Upload material"}
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/" })}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
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
