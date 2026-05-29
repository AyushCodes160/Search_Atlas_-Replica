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

  const fix = await prisma.ottoFix.findFirst({
    where: { id, userId: session.user.id }
  });

  if (!fix) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await prisma.ottoFix.delete({
    where: { id }
  });

  return NextResponse.json({ ok: true });
}
