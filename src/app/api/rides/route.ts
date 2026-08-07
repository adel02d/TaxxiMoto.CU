import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { serializePrisma } from "../../../lib/utils";

export async function GET() {
  try {
    const rides = await prisma.ride.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    return NextResponse.json(serializePrisma(rides));
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const { rideId, status } = await request.json();
    const updated = await prisma.ride.update({ where: { id: parseInt(rideId) }, data: { status } });
    return NextResponse.json(serializePrisma(updated));
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
