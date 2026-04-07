import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [totalRides, todayRides, completedRides, pendingRides, cancelledRides, totalEarnings, todayEarnings, activeDrivers] =
      await Promise.all([
        prisma.ride.count(), prisma.ride.count({ where: { createdAt: { gte: today } } }),
        prisma.ride.count({ where: { status: "completed" } }), prisma.ride.count({ where: { status: "pending" } }),
        prisma.ride.count({ where: { status: "cancelled" } }),
        prisma.ride.aggregate({ _sum: { fare: true }, where: { status: "completed" } }),
        prisma.ride.aggregate({ _sum: { fare: true }, where: { status: "completed", completedAt: { gte: today } } }),
        prisma.driver.count({ where: { isActive: true } }),
      ]);
    return NextResponse.json({
      totalRides, todayRides, completedRides, pendingRides, cancelledRides,
      totalEarnings: totalEarnings._sum.fare || 0, todayEarnings: todayEarnings._sum.fare || 0, activeDrivers,
    });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
