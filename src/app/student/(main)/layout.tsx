import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/auth/session";
import { StudentBackLink } from "@/components/StudentBackLink";

export default async function StudentMainLayout({ children }: { children: React.ReactNode }) {
  const s = await readSession();
  if (!s || s.role !== "STUDENT") redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: s.sub },
    select: { placementCompletedAt: true },
  });
  if (!user?.placementCompletedAt) {
    redirect("/student/placement");
  }

  return (
    <>
      <StudentBackLink />
      {children}
    </>
  );
}
