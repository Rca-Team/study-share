import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "StudyShare • Made by Gaurav" },
      {
        name: "description",
        content: "About the creator of StudyShare and the mission behind the platform.",
      },
      { property: "og:title", content: "StudyShare • Made by Gaurav" },
      {
        property: "og:description",
        content: "Developed and designed by Gaurav (Class 11-A) to make study resources accessible for everyone.",
      },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <main className="section-frame py-10">
      <section className="mx-auto max-w-3xl rounded-2xl border border-border bg-card/80 p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-extrabold text-foreground">About the Creator</h1>

        <div className="mt-5 space-y-3 text-foreground">
          <p className="text-lg font-semibold">Made by Gaurav</p>
          <p className="text-sm text-muted-foreground">Class 11-A</p>
          <p className="text-base leading-relaxed text-muted-foreground">
            This platform was created to help students freely share and access quality study
            materials, making learning easier and more accessible for everyone.
          </p>
          <p className="pt-2 text-sm font-medium text-foreground">
            Developed and Designed by Gaurav (Class 11-A).
          </p>
        </div>
      </section>
    </main>
  );
}
