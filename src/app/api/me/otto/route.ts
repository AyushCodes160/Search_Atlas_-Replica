import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Fetch user's saved OttoFix items
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const fixes = await prisma.ottoFix.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ fixes });
}

// Add or update an OttoFix
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { url, domain, fixType, originalValue, optimizedValue, status } = await req.json();

  if (!url || !domain || !fixType || optimizedValue == null) {
    return NextResponse.json({ error: "url, domain, fixType and optimizedValue are required" }, { status: 400 });
  }

  const userId = session.user.id;

  // Deduplicate: if there's a prior fix for this URL + fixType, update it. Otherwise, create a new one.
  // Exception: for img_alt, we might store them differently or group them, but since we map each src in optimizedValue,
  // we can key image alts by originalValue (which is the image src).
  const uniqueQuery = {
    userId,
    url: url.trim(),
    domain: domain.trim(),
    fixType,
    ...(fixType === "img_alt" ? { originalValue: originalValue } : {})
  };

  let fix = await prisma.ottoFix.findFirst({
    where: uniqueQuery,
  });

  if (fix) {
    fix = await prisma.ottoFix.update({
      where: { id: fix.id },
      data: {
        optimizedValue: String(optimizedValue),
        status: status || "applied",
        appliedAt: status === "applied" ? new Date() : null,
      }
    });
  } else {
    fix = await prisma.ottoFix.create({
      data: {
        userId,
        url: url.trim(),
        domain: domain.trim(),
        fixType,
        originalValue: originalValue || null,
        optimizedValue: String(optimizedValue),
        status: status || "applied",
        appliedAt: status === "applied" ? new Date() : null,
      }
    });
  }

  return NextResponse.json({ fix });
}
