"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";

async function signInAsRole(role: "STUDENT" | "TUTOR") {
  const user = await prisma.user.findFirst({
    where: { role },
    orderBy: { createdAt: "asc" },
  });
  if (!user) {
    redirect("/login?error=setup");
  }

  const token = await createSessionToken({ sub: user.id, role: user.role });
  await setSessionCookie(token);

  if (user.role === "STUDENT") {
    redirect("/student");
  }
  redirect("/tutor");
}

export async function loginAsStudent() {
  await signInAsRole("STUDENT");
}

export async function loginAsTutor() {
  await signInAsRole("TUTOR");
}

export async function logoutAction() {
  const { clearSessionCookie } = await import("@/lib/auth/session");
  await clearSessionCookie();
  redirect("/login");
}
