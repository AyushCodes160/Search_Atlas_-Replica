import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// List signed-in user's tracked keywords and history snapshots
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const keywords = await prisma.trackedKeyword.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      history: {
        orderBy: { date: "desc" },
        take: 30, // Get last 30 daily snapshots for graphing
      },
    },
  });

  return NextResponse.json({ keywords });
}

// Add a new tracked keyword + save the initial rank check snapshot
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { keyword, domain, position, searchVolume, cpc, serpFeatures } = await req.json();

  if (!keyword || !domain || position == null) {
    return NextResponse.json({ error: "keyword, domain, and position are required" }, { status: 400 });
  }

  const userId = session.user.id;

  // Check if keyword is already tracked for this domain by the user
  let tracked = await prisma.trackedKeyword.findFirst({
    where: { userId, keyword: keyword.trim(), domain: domain.trim() },
  });

  if (!tracked) {
    // Check if user has hit maximum keyword limits (e.g. limit to 50 keywords for performance/free budget)
    const count = await prisma.trackedKeyword.count({ where: { userId } });
    if (count >= 50) {
      return NextResponse.json({ error: "Keyword limit exceeded (max 50 keywords)" }, { status: 400 });
    }

    tracked = await prisma.trackedKeyword.create({
      data: {
        userId,
        keyword: keyword.trim(),
        domain: domain.trim(),
      },
    });
  }

  // Add the rank snapshot to history
  const snapshot = await prisma.rankHistory.create({
    data: {
      trackedKeywordId: tracked.id,
      position: Number(position) || 101,
      searchVolume: searchVolume != null ? Number(searchVolume) : null,
      cpc: cpc != null ? Number(cpc) : null,
      serpFeatures: serpFeatures || [],
    },
  });

  return NextResponse.json({ keyword: tracked, snapshot });
}
