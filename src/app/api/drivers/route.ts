import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { serializePrisma } from "../../../lib/utils";

export async function GET() {
  try {
    const drivers = await prisma.driver.findMany({ where: { isActive: true }, orderBy: { totalRides: "desc" } });
    return NextResponse.json(serializePrisma(drivers));
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const { telegramId, firstName, lastName, phone, motorcyclePlate } = await request.json();
    const driver = await prisma.driver.upsert({
      where: { telegramId: BigInt(telegramId) },
      update: { firstName, lastName: lastName || null, phone: phone || null, motorcyclePlate: motorcyclePlate || null, isActive: true },
      create: { telegramId: BigInt(telegramId), firstName, lastName: lastName || null, phone: phone || null, motorcyclePlate: motorcyclePlate || null },
    });
    return NextResponse.json(serializePrisma(driver));
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
