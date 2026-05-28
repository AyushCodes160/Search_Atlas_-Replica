import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// List the signed-in user's saved audits (newest first, capped).
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rows = await prisma.audit.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  // Map back to the StoredAudit shape the History UI expects.
  const audits = rows.map((r) => ({
    id: r.id,
    url: r.url,
    sourceType: r.sourceType as "web" | "api",
    ranAt: r.createdAt.getTime(),
    scores:
      r.performance != null
        ? {
            performance: r.performance,
            seo: r.seo ?? 0,
            accessibility: r.accessibility ?? 0,
            bestPractices: r.bestPractices ?? 0,
          }
        : undefined,
    ...((r.data as object) || {}),
  }));
  return NextResponse.json({ audits });
}

// Clear all of the signed-in user's audits.
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await prisma.audit.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ ok: true });
}

// Save an audit for the signed-in user. Dedupes by URL (keeps the latest).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  if (!body?.url || typeof body.url !== "string") {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }
  const userId = session.user.id;

  // Replace any prior audit for the same URL so history doesn't fill with dupes.
  await prisma.audit.deleteMany({ where: { userId, url: body.url } });

  const created = await prisma.audit.create({
    data: {
      userId,
      url: body.url,
      sourceType: body.sourceType === "api" ? "api" : "web",
      performance: body.scores?.performance ?? null,
      seo: body.scores?.seo ?? null,
      accessibility: body.scores?.accessibility ?? null,
      bestPractices: body.scores?.bestPractices ?? null,
      lcp: body.vitals?.lcp ?? null,
      words: body.onPage?.words ?? null,
      data: body,
    },
  });

  // Keep only the most recent 50 per user.
  const extra = await prisma.audit.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: 50,
    select: { id: true },
  });
  if (extra.length > 0) {
    await prisma.audit.deleteMany({ where: { id: { in: extra.map((e) => e.id) } } });
  }

  return NextResponse.json({ id: created.id });
}
