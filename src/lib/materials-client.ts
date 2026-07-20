import { supabase } from "@/integrations/supabase/client";
import {
  getSignedMaterialUrl,
  makePdfThumbnailDataUrl,
  normalizeFileType,
  toTags,
  type MaterialRow,
} from "@/lib/studyshare";

export type MaterialSort = "latest" | "downloads" | "views" | "az";

export type MaterialFilters = {
  q?: string;
  subject?: string;
  classLevel?: string;
  fileType?: string;
  sort?: MaterialSort;
  page?: number;
  pageSize?: number;
};

export async function fetchMaterials(filters: MaterialFilters = {}) {
  const page = filters.page ?? 0;
  const pageSize = filters.pageSize ?? 12;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("materials").select("*", { count: "exact" }).eq("is_hidden", false);

  if (filters.q && filters.q.trim()) {
    const term = filters.q.trim();
    query = query.or(
      `title.ilike.%${term}%,description.ilike.%${term}%,subject.ilike.%${term}%,class_level.ilike.%${term}%,tags.cs.{${term.toLowerCase()}}`,
    );
  }
  if (filters.subject) query = query.eq("subject", filters.subject);
  if (filters.classLevel) query = query.eq("class_level", filters.classLevel);
  if (filters.fileType) query = query.eq("file_type", filters.fileType);

  if (filters.sort === "downloads") query = query.order("downloads", { ascending: false });
  else if (filters.sort === "views") query = query.order("views", { ascending: false });
  else if (filters.sort === "az") query = query.order("title", { ascending: true });
  else query = query.order("created_at", { ascending: false });

  const { data, count, error } = await query.range(from, to);
  if (error) throw error;

  return {
    items: (data ?? []) as MaterialRow[],
    count: count ?? 0,
    hasMore: (count ?? 0) > to + 1,
  };
}

export async function fetchMaterialById(id: string) {
  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .eq("id", id)
    .eq("is_hidden", false)
    .single();
  if (error) throw error;
  return data as MaterialRow;
}

export async function fetchRelatedMaterials(material: MaterialRow) {
  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .eq("is_hidden", false)
    .eq("subject", material.subject)
    .neq("id", material.id)
    .order("downloads", { ascending: false })
    .limit(6);
  if (error) throw error;
  return (data ?? []) as MaterialRow[];
}

export async function fetchComments(materialId: string) {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("material_id", materialId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addComment(materialId: string, username: string, comment: string) {
  const { error } = await supabase.from("comments").insert({ material_id: materialId, username, comment });
  if (error) throw error;
}

export async function addReport(materialId: string, reason: string, reporterName?: string) {
  const { error } = await supabase.from("reports").insert({ material_id: materialId, reason, reporter_name: reporterName ?? null });
  if (error) throw error;
}

export async function incrementMetric(materialId: string, metric: "views" | "downloads" | "likes") {
  if (metric === "views") {
    const { data, error } = await supabase
      .from("materials")
      .select("views")
      .eq("id", materialId)
      .single();
    if (error) throw error;
    const { error: updateError } = await supabase
      .from("materials")
      .update({ views: Number(data?.views ?? 0) + 1 })
      .eq("id", materialId);
    if (updateError) throw updateError;
    return;
  }

  if (metric === "downloads") {
    const { data, error } = await supabase
      .from("materials")
      .select("downloads")
      .eq("id", materialId)
      .single();
    if (error) throw error;
    const { error: updateError } = await supabase
      .from("materials")
      .update({ downloads: Number(data?.downloads ?? 0) + 1 })
      .eq("id", materialId);
    if (updateError) throw updateError;
    return;
  }

  const { data, error } = await supabase
    .from("materials")
    .select("likes")
    .eq("id", materialId)
    .single();
  if (error) throw error;
  const { error: updateError } = await supabase
    .from("materials")
    .update({ likes: Number(data?.likes ?? 0) + 1 })
    .eq("id", materialId);
  if (updateError) throw updateError;
}

export async function getDownloadUrl(filePath: string) {
  return getSignedMaterialUrl(filePath, 60 * 30);
}

export async function uploadMaterial(args: {
  file: File;
  title: string;
  description?: string;
  subject: string;
  classLevel: string;
  tagsRaw: string;
  uploaderName?: string;
  onProgress?: (progress: number, stage: string) => void;
}) {
  args.onProgress?.(8, "Validating file");
  const fileExt = normalizeFileType(args.file.name);
  const id = crypto.randomUUID();
  const path = `${id}.${fileExt}`;
  const fileType = fileExt;

  args.onProgress?.(20, "Uploading file");
  const { error: uploadError } = await supabase.storage.from("materials").upload(path, args.file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) throw uploadError;

  args.onProgress?.(65, "Preparing preview");
  const fileUrl = await getSignedMaterialUrl(path, 60 * 60 * 24 * 7);
  const defaultThumbnail =
    fileType === "pdf"
      ? makePdfThumbnailDataUrl(args.title)
      : ["jpg", "jpeg", "png", "webp"].includes(fileType)
        ? fileUrl
        : null;

  args.onProgress?.(85, "Saving material details");
  const { data, error } = await supabase
    .from("materials")
    .insert({
      title: args.title,
      description: args.description || null,
      subject: args.subject,
      class_level: args.classLevel,
      tags: toTags(args.tagsRaw),
      uploader_name: args.uploaderName || null,
      file_path: path,
      file_url: fileUrl,
      thumbnail_url: defaultThumbnail,
      file_type: fileType,
      file_size: args.file.size,
    })
    .select("id")
    .single();

  if (error) throw error;
  args.onProgress?.(100, "Upload complete");
  return data.id as string;
}

export async function fetchAdminData() {
  const [{ data: materials, error: materialsError }, { data: reports, error: reportsError }] = await Promise.all([
    supabase.from("materials").select("*").order("created_at", { ascending: false }).limit(200),
    supabase
      .from("reports")
      .select("id, reason, created_at, reporter_name, material_id, materials(title, subject)")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (materialsError) throw materialsError;
  if (reportsError) throw reportsError;

  return { materials: (materials ?? []) as MaterialRow[], reports: reports ?? [] };
}

export async function setMaterialPin(id: string, isPinned: boolean) {
  const { error } = await supabase.from("materials").update({ is_pinned: isPinned }).eq("id", id);
  if (error) throw error;
}

export async function setMaterialHidden(id: string, isHidden: boolean) {
  const { error } = await supabase.from("materials").update({ is_hidden: isHidden }).eq("id", id);
  if (error) throw error;
}

export async function deleteMaterial(id: string, filePath: string) {
  const [{ error: dbError }, { error: fileError }] = await Promise.all([
    supabase.from("materials").delete().eq("id", id),
    supabase.storage.from("materials").remove([filePath]),
  ]);
  if (dbError) throw dbError;
  if (fileError) throw fileError;
}

export async function deleteReport(id: string) {
  const { error } = await supabase.from("reports").delete().eq("id", id);
  if (error) throw error;
}
