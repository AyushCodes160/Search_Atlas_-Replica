import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  // Make sure the tracked keyword belongs to the signed-in user
  const keyword = await prisma.trackedKeyword.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!keyword) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Delete relation cascades will delete associated RankHistory automatically due to onDelete: Cascade
  await prisma.trackedKeyword.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}
