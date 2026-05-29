import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// DELETE — remove a saved local SEO audit
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  // Only delete if it belongs to the user
  const audit = await prisma.localSeoAudit.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!audit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.localSeoAudit.delete({ where: { id } });

  return NextResponse.json({ deleted: true });
}
