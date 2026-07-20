import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FormEvent, useState } from "react";
import { z } from "zod";
import { StudyShareLogo } from "@/components/studyshare-logo";
import { unlockAdmin } from "@/lib/admin-gate.functions";

const passcodeSchema = z
  .string()
  .trim()
  .min(1, "Passcode is required")
  .max(32, "Passcode is too long");

export const Route = createFileRoute("/admin-unlock")({
  head: () => ({
    meta: [
      { title: "Admin unlock — StudyShare" },
      { name: "description", content: "Unlock StudyShare admin panel with passcode." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminUnlockPage,
});

function AdminUnlockPage() {
  const router = useRouter();
  const unlock = useServerFn(unlockAdmin);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = passcodeSchema.safeParse(passcode);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid passcode");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await unlock({ data: { passcode: parsed.data } });
      if (!result.ok) {
        setError("Incorrect passcode");
        return;
      }

      await router.navigate({ to: "/admin", replace: true });
    } catch {
      setError("Unable to unlock admin right now");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card/90 p-5 shadow-xl sm:p-6">
        <StudyShareLogo compact className="justify-center gap-2" iconClassName="h-11 w-11 rounded-xl" />
        <h1 className="mt-5 text-center text-2xl font-extrabold text-foreground">Admin passcode</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">Enter passcode to open the StudyShare admin panel.</p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <label className="block text-xs font-semibold text-muted-foreground">Passcode</label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
            placeholder="Enter admin passcode"
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="h-10 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Unlocking..." : "Unlock admin"}
          </button>
        </form>
      </section>
    </main>
  );
}
