import { supabase } from "@/integrations/supabase/client";

export type MaterialRow = {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  class_level: string;
  tags: string[];
  uploader_name: string | null;
  file_path: string;
  file_url: string;
  thumbnail_url: string | null;
  file_type: string;
  file_size: number;
  downloads: number;
  views: number;
  likes: number;
  is_pinned: boolean;
  is_hidden: boolean;
  created_at: string;
};

export const CLASS_OPTIONS = [
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "JEE",
  "NEET",
  "College",
  "Other",
] as const;

export const MATERIAL_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,.ppt,.pptx,.doc,.docx,.txt,.zip,application/pdf,image/jpeg,image/png,image/webp,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/zip,application/x-zip-compressed";

export function normalizeFileType(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "file";
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let idx = 0;
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[idx]}`;
}

export function formatCount(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export async function getSignedMaterialUrl(filePath: string, expiresIn = 60 * 60 * 12) {
  const { data, error } = await supabase.storage.from("materials").createSignedUrl(filePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export function toTags(raw: string) {
  return raw
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 10);
}

export function makePdfThumbnailDataUrl(title: string) {
  const safeTitle = title.replace(/[<>&"]/g, "");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='500'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#4a6cf7'/><stop offset='100%' stop-color='#8b5cf6'/></linearGradient></defs><rect width='100%' height='100%' rx='32' fill='url(#g)'/><rect x='36' y='36' width='728' height='428' rx='24' fill='rgba(255,255,255,0.12)'/><text x='64' y='122' fill='white' font-size='48' font-family='Inter,Arial,sans-serif' font-weight='700'>PDF</text><text x='64' y='192' fill='white' opacity='0.95' font-size='34' font-family='Inter,Arial,sans-serif'>${safeTitle.slice(0, 46)}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  jpg: "Image",
  jpeg: "Image",
  png: "Image",
  webp: "Image",
  ppt: "PowerPoint",
  pptx: "PowerPoint",
  doc: "Word",
  docx: "Word",
  txt: "Text",
  zip: "Zip",
};
