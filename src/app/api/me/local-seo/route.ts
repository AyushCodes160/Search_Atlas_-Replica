import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET — fetch user's saved local SEO audits
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const audits = await prisma.localSeoAudit.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({ audits });
}

// POST — save a new local SEO audit
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { businessName, url, city, napScore, schemaScore, localScore, data } =
    body;

  if (!businessName || !url || !city) {
    return NextResponse.json(
      { error: "businessName, url, and city are required" },
      { status: 400 }
    );
  }

  const audit = await prisma.localSeoAudit.create({
    data: {
      userId: session.user.id,
      businessName,
      url,
      city,
      napScore: napScore ?? 0,
      schemaScore: schemaScore ?? 0,
      localScore: localScore ?? 0,
      data: data ?? {},
    },
  });

  return NextResponse.json({ id: audit.id });
}
