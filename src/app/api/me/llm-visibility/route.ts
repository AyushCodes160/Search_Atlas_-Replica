import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// List the signed-in user's LLM Visibility queries and snapshots.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rows = await prisma.llmQuery.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      snapshots: {
        orderBy: { date: "desc" },
        take: 50,
      },
    },
  });
  
  const queries = rows.map((r) => ({
    id: r.id,
    query: r.query,
    brandName: r.brandName,
    competitors: r.competitors,
    savedAt: r.createdAt.getTime(),
    snapshots: r.snapshots.map(s => ({
      id: s.id,
      score: s.score,
      date: s.date.getTime(),
      data: s.data,
    })),
  }));
  
  return NextResponse.json({ queries });
}

// Save a new LLM Visibility query run.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  if (!body?.query || !body?.brandName || body?.score == null || !body?.data) {
    return NextResponse.json({ error: "query, brandName, score, and data are required" }, { status: 400 });
  }
  const userId = session.user.id;

  // Deduplicate: remove any prior run with the same query + brand to avoid duplicates.
  await prisma.llmQuery.deleteMany({
    where: { userId, query: body.query, brandName: body.brandName },
  });

  const created = await prisma.llmQuery.create({
    data: {
      userId,
      query: body.query,
      brandName: body.brandName,
      competitors: body.competitors || "",
      snapshots: {
        create: {
          score: Number(body.score) || 0,
          data: body.data || {},
        },
      },
    },
  });

  // Keep only the most recent 50 queries per user.
  const extra = await prisma.llmQuery.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: 50,
    select: { id: true },
  });
  
  if (extra.length > 0) {
    await prisma.llmQuery.deleteMany({
      where: { id: { in: extra.map((e) => e.id) } },
    });
  }

  return NextResponse.json({ id: created.id });
}
