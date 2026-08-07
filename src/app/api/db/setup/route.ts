import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

export async function GET() {
  const results: string[] = [];

  try {
    results.push("Iniciando reparación de base de datos...");

    // 1. Asegurar tablas básicas
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" SERIAL PRIMARY KEY,
        "telegramId" BIGINT NOT NULL UNIQUE,
        "firstName" TEXT NOT NULL,
        "lastName" TEXT, "username" TEXT, "phone" TEXT,
        "role" TEXT NOT NULL DEFAULT 'client',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    results.push("Tabla User verificada.");

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Driver" (
        "id" SERIAL PRIMARY KEY,
        "telegramId" BIGINT NOT NULL UNIQUE,
        "firstName" TEXT NOT NULL,
        "lastName" TEXT, "username" TEXT, "phone" TEXT,
        "motorcyclePlate" TEXT, "motorcycleModel" TEXT,
        "status" TEXT NOT NULL DEFAULT 'available',
        "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
        "totalRides" INTEGER NOT NULL DEFAULT 0,
        "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    results.push("Tabla Driver verificada.");

    // 2. REPARACIÓN: Añadir columnas que faltan a Driver si ya existía
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "freeRidesLeft" INTEGER NOT NULL DEFAULT 5;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "debt" DOUBLE PRECISION NOT NULL DEFAULT 0;`);
      results.push("Columnas de Driver (freeRidesLeft, debt) reparadas/añadidas.");
    } catch (e) { results.push("Driver ya estaba actualizado."); }

    // 3. Asegurar Ride
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Ride" (
        "id" SERIAL PRIMARY KEY,
        "clientId" BIGINT NOT NULL,
        "clientName" TEXT NOT NULL,
        "clientPhone" TEXT, "driverId" BIGINT, "driverName" TEXT,
        "pickupAddress" TEXT NOT NULL, "dropoffAddress" TEXT,
        "pickupLat" DOUBLE PRECISION, "pickupLng" DOUBLE PRECISION,
        "dropoffLat" DOUBLE PRECISION, "dropoffLng" DOUBLE PRECISION,
        "fare" DOUBLE PRECISION, "distance" DOUBLE PRECISION,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "completedAt" TIMESTAMP(3),
        CONSTRAINT "Ride_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("telegramId") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "Ride_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("telegramId") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);
    results.push("Tabla Ride verificada.");

    // 4. Asegurar Settings
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Setting" (
        "key" TEXT NOT NULL PRIMARY KEY,
        "value" TEXT NOT NULL
      );
    `);
    results.push("Tabla Setting verificada.");

    return NextResponse.json({
      ok: true,
      message: "BASE DE DATOS REPARADA Y ACTUALIZADA",
      steps: results
    });
  } catch (error: any) {
    console.error("Setup error:", error);
    return NextResponse.json({
      ok: false,
      error: error.message,
      steps: results
    }, { status: 500 });
  }
}
