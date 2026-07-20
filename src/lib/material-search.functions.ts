import { createServerFn } from "@tanstack/react-start";
import { NoObjectGeneratedError, Output, generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const AiSearchInput = z.object({
  query: z.string(),
  candidates: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      subject: z.string(),
      classLevel: z.string(),
      tags: z.array(z.string()),
      fileType: z.string(),
      downloads: z.number(),
      views: z.number(),
      createdAt: z.string(),
    }),
  ),
});

type AiCandidate = z.infer<typeof AiSearchInput>["candidates"][number];

function fallbackRanking(query: string, candidates: AiCandidate[]) {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  return [...candidates]
    .map((candidate) => {
      const searchable = [
        candidate.title,
        candidate.description ?? "",
        candidate.subject,
        candidate.classLevel,
        candidate.tags.join(" "),
        candidate.fileType,
      ]
        .join(" ")
        .toLowerCase();

      const tokenScore = tokens.reduce((acc, token) => acc + (searchable.includes(token) ? 1 : 0), 0);
      const popularity = Math.log10(candidate.downloads + candidate.views + 10);
      return {
        id: candidate.id,
        score: tokenScore * 2 + popularity,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.id);
}

export const rankMaterialsByAi = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AiSearchInput.parse(input))
  .handler(async ({ data }) => {
    const query = data.query.trim();
    if (!query) {
      return {
        rankedIds: data.candidates.map((candidate) => candidate.id),
        rewrittenQuery: "",
        reason: "",
      };
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return {
        rankedIds: fallbackRanking(query, data.candidates),
        rewrittenQuery: query,
        reason: "AI key missing, used keyword ranking.",
      };
    }

    const gateway = createLovableAiGatewayProvider(key);

    const compactCandidates = data.candidates.slice(0, 80).map((candidate) => ({
      id: candidate.id,
      title: candidate.title,
      description: candidate.description ?? "",
      subject: candidate.subject,
      classLevel: candidate.classLevel,
      tags: candidate.tags,
      fileType: candidate.fileType,
      popularity: candidate.downloads + candidate.views,
    }));

    const prompt = [
      "You rank study materials by semantic relevance.",
      `User query: ${query}`,
      "Return ids only from provided candidates.",
      "Prefer conceptual match first, then freshness and popularity.",
      "Candidates JSON:",
      JSON.stringify(compactCandidates),
    ].join("\n\n");

    try {
      const { output } = await generateText({
        model: gateway("google/gemini-3.5-flash"),
        output: Output.object({
          schema: z.object({
            rankedIds: z.array(z.string()),
            rewrittenQuery: z.string().optional(),
            reason: z.string().optional(),
          }),
        }),
        prompt,
      });

      const allowed = new Set(compactCandidates.map((candidate) => candidate.id));
      const rankedIds = output.rankedIds.filter((id) => allowed.has(id));
      const remainingIds = compactCandidates
        .map((candidate) => candidate.id)
        .filter((id) => !rankedIds.includes(id));

      return {
        rankedIds: [...rankedIds, ...remainingIds],
        rewrittenQuery: output.rewrittenQuery ?? query,
        reason: output.reason ?? "Semantic ranking applied.",
      };
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        return {
          rankedIds: fallbackRanking(query, compactCandidates),
          rewrittenQuery: query,
          reason: "AI output format fallback used.",
        };
      }

      return {
        rankedIds: fallbackRanking(query, compactCandidates),
        rewrittenQuery: query,
        reason: "AI unavailable, keyword fallback used.",
      };
    }
  });
