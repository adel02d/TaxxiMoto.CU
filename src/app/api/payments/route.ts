import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    return NextResponse.json(await prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 50 }));
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
