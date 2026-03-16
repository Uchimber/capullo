import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ps = searchParams.get("ps");

  if (!ps) {
    return NextResponse.json({ error: "Missing ps" }, { status: 400 });
  }

  const pending = await prisma.pendingPayment.findUnique({
    where: { id: ps },
  });

  if (!pending) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    bookingId: pending.bookingId ?? null,
  });
}
