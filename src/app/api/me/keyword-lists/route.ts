import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// List the signed-in user's saved keyword lists.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rows = await prisma.keywordList.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const lists = rows.map((r) => ({
    id: r.id,
    seed: r.seed,
    savedAt: r.createdAt.getTime(),
    data: r.data,
  }));
  return NextResponse.json({ lists });
}

// Save a keyword list.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  if (!body?.seed || !body?.data) {
    return NextResponse.json({ error: "seed and data required" }, { status: 400 });
  }
  const userId = session.user.id;
  // Replace any prior list with the same seed.
  await prisma.keywordList.deleteMany({ where: { userId, seed: body.seed } });
  const created = await prisma.keywordList.create({
    data: {
      userId,
      seed: body.seed,
      total: Number(body.total) || 0,
      data: body.data,
    },
  });
  // Cap at 50 most recent.
  const extra = await prisma.keywordList.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: 50,
    select: { id: true },
  });
  if (extra.length > 0) {
    await prisma.keywordList.deleteMany({ where: { id: { in: extra.map((e) => e.id) } } });
  }
  return NextResponse.json({ id: created.id });
}
