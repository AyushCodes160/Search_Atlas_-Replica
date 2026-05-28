import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Delete one of the signed-in user's audits.
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  // deleteMany scoped to userId so a user can only delete their own rows.
  await prisma.audit.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
