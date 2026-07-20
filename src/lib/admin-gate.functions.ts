import { createHash, timingSafeEqual } from "node:crypto";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

const unlockInputSchema = z.object({
  passcode: z
    .string()
    .trim()
    .min(1, "Passcode is required")
    .max(32, "Passcode is too long"),
});

const sessionConfig = {
  password: process.env.SESSION_SECRET!,
  name: "studyshare-admin-gate",
  maxAge: 60 * 60 * 24 * 7,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
  },
};

type AdminGateSession = {
  unlocked?: boolean;
};

function passcodeMatches(input: string, expected: string) {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export const unlockAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => unlockInputSchema.parse(input))
  .handler(async ({ data }) => {
    const expected = process.env.SITE_PASSWORD;
    if (!expected) {
      throw new Error("SITE_PASSWORD is not configured");
    }

    const session = await useSession<AdminGateSession>(sessionConfig);
    if (!passcodeMatches(data.passcode, expected)) {
      return { ok: false as const };
    }

    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<AdminGateSession>(sessionConfig);
  await session.clear();
  return { ok: true as const };
});

export const requireAdminUnlocked = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AdminGateSession>(sessionConfig);
  if (!session.data.unlocked) {
    throw redirect({ to: "/admin-unlock" });
  }
  return { ok: true as const };
});
