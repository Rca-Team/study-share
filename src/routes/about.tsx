import { Link, createFileRoute } from "@tanstack/react-router";
import { StudyShareLogo } from "@/components/studyshare-logo";

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
    <main className="min-h-screen pb-16">
      <section className="section-frame mx-auto mt-6 max-w-5xl overflow-hidden p-6 sm:p-8">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <StudyShareLogo compact className="gap-2" iconClassName="h-10 w-10 rounded-xl" />
          <Link
            to="/"
            className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Back to library
          </Link>
        </header>

        <h1 className="mt-7 text-3xl font-extrabold text-foreground sm:text-4xl">About the Creator</h1>

        <div className="mt-5 space-y-3 text-foreground">
          <p className="text-xl font-semibold">Made by Gaurav</p>
          <p className="text-sm text-muted-foreground">Class 11-A</p>
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
            This platform was created to help students freely share and access quality study
            materials, making learning easier and more accessible for everyone.
          </p>
          <p className="pt-2 text-sm font-semibold text-foreground">
            Developed and Designed by Gaurav (Class 11-A).
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <article className="glass-panel rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">Mission</p>
            <p className="mt-2 text-sm font-semibold text-foreground">Accessible learning for every student</p>
          </article>
          <article className="glass-panel rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">Model</p>
            <p className="mt-2 text-sm font-semibold text-foreground">Community-powered resource sharing</p>
          </article>
          <article className="glass-panel rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">Built by</p>
            <p className="mt-2 text-sm font-semibold text-foreground">Gaurav · Class 11-A</p>
          </article>
        </div>
      </section>
    </main>
  );
}
