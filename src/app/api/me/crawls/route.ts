import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// List the signed-in user's saved site crawls.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rows = await prisma.siteCrawl.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const crawls = rows.map((r) => ({
    id: r.id,
    origin: r.origin,
    pages: r.pages,
    mode: r.mode,
    healthScore: r.healthScore,
    summary: r.summary,
    ranAt: r.createdAt.getTime(),
    data: r.data,
  }));
  return NextResponse.json({ crawls });
}

// Save a site crawl summary.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  if (!body?.origin) {
    return NextResponse.json({ error: "origin required" }, { status: 400 });
  }
  const userId = session.user.id;
  // Replace any prior crawl for the same origin.
  await prisma.siteCrawl.deleteMany({ where: { userId, origin: body.origin } });
  const created = await prisma.siteCrawl.create({
    data: {
      userId,
      origin: body.origin,
      pages: Number(body.pages) || 0,
      mode: body.mode === "deep" ? "deep" : "fast",
      healthScore: body.healthScore ?? null,
      summary: body.summary ?? null,
      data: body.data ?? {},
    },
  });
  const extra = await prisma.siteCrawl.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: 30,
    select: { id: true },
  });
  if (extra.length > 0) {
    await prisma.siteCrawl.deleteMany({ where: { id: { in: extra.map((e) => e.id) } } });
  }
  return NextResponse.json({ id: created.id });
}
