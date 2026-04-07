import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    return NextResponse.json(await prisma.driver.findMany({ where: { isActive: true }, orderBy: { totalRides: "desc" } }));
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const { telegramId, firstName, lastName, phone, motorcyclePlate } = await request.json();
    const driver = await prisma.driver.upsert({
      where: { telegramId: parseInt(telegramId) },
      update: { firstName, lastName: lastName || null, phone: phone || null, motorcyclePlate: motorcyclePlate || null, isActive: true },
      create: { telegramId: parseInt(telegramId), firstName, lastName: lastName || null, phone: phone || null, motorcyclePlate: motorcyclePlate || null },
    });
    return NextResponse.json(driver);
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
