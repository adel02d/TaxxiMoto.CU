import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    return NextResponse.json(await prisma.ride.findMany({ orderBy: { createdAt: "desc" }, take: 50 }));
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const { rideId, status } = await request.json();
    return NextResponse.json(await prisma.ride.update({ where: { id: parseInt(rideId) }, data: { status } }));
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
