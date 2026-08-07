import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { serializePrisma } from "../../../lib/utils";

export async function GET() {
  try {
    const payments = await prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    return NextResponse.json(serializePrisma(payments));
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
