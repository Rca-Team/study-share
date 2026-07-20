import { createFileRoute } from "@tanstack/react-router";
import { getPublicSupabaseServerClient } from "@/lib/materials.server";

const BASE_URL = "https://id-preview--231a390b-f19f-440e-9c64-dc52e9086144.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "hourly", priority: "1.0" },
          { path: "/upload", changefreq: "weekly", priority: "0.8" },
        ];

        try {
          const supabase = getPublicSupabaseServerClient();
          const { data } = await supabase
            .from("materials")
            .select("id,updated_at")
            .eq("is_hidden", false)
            .order("updated_at", { ascending: false })
            .limit(1000);

          for (const material of data ?? []) {
            entries.push({
              path: `/materials/${material.id}`,
              lastmod: material.updated_at ?? undefined,
              changefreq: "weekly",
              priority: "0.7",
            });
          }
        } catch {
          // Keep static entries even when DB is unavailable.
        }

        const urls = entries.map((entry) =>
          [
            "  <url>",
            `    <loc>${BASE_URL}${entry.path}</loc>`,
            entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : null,
            entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : null,
            entry.priority ? `    <priority>${entry.priority}</priority>` : null,
            "  </url>",
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
