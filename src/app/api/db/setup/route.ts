import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const results: string[] = [];

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" SERIAL PRIMARY KEY,
        "telegramId" INTEGER NOT NULL UNIQUE,
        "firstName" TEXT NOT NULL,
        "lastName" TEXT,
        "username" TEXT,
        "phone" TEXT,
        "role" TEXT NOT NULL DEFAULT 'client',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    results.push("User OK");

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Driver" (
        "id" SERIAL PRIMARY KEY,
        "telegramId" INTEGER NOT NULL UNIQUE,
        "firstName" TEXT NOT NULL,
        "lastName" TEXT,
        "username" TEXT,
        "phone" TEXT,
        "motorcyclePlate" TEXT,
        "motorcycleModel" TEXT,
        "status" TEXT NOT NULL DEFAULT 'available',
        "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
        "totalRides" INTEGER NOT NULL DEFAULT 0,
        "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    results.push("Driver OK");

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Ride" (
        "id" SERIAL PRIMARY KEY,
        "clientId" INTEGER NOT NULL,
        "clientName" TEXT NOT NULL,
        "clientPhone" TEXT,
        "driverId" INTEGER,
        "driverName" TEXT,
        "pickupAddress" TEXT NOT NULL,
        "dropoffAddress" TEXT,
        "pickupLat" DOUBLE PRECISION,
        "pickupLng" DOUBLE PRECISION,
        "dropoffLat" DOUBLE PRECISION,
        "dropoffLng" DOUBLE PRECISION,
        "fare" DOUBLE PRECISION,
        "distance" DOUBLE PRECISION,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "completedAt" TIMESTAMP(3),
        CONSTRAINT "Ride_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("telegramId") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "Ride_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("telegramId") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);
    results.push("Ride OK");

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Payment" (
        "id" SERIAL PRIMARY KEY,
        "rideId" INTEGER NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "method" TEXT NOT NULL DEFAULT 'cash',
        "status" TEXT NOT NULL DEFAULT 'pending',
        "paidAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Payment_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);
    results.push("Payment OK");

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) NOT NULL PRIMARY KEY,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      );
    `);

    return NextResponse.json({
      ok: true,
      message: "Base de datos lista",
      tables: results,
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error.message,
      tables: results,
    }, { status: 500 });
  }
}
