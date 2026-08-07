import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { getBot } from "../../../../lib/bot";
import { InlineKeyboard } from "grammy";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, clientName, clientPhone, pickup, dropoff, pickupCoords, dropoffCoords, fare, distance } = body;

    if (!userId) return NextResponse.json({ ok: false, error: "Falta ID" }, { status: 400 });

    // 1. Asegurar usuario
    await prisma.user.upsert({
      where: { telegramId: BigInt(userId) },
      update: { firstName: clientName || "Cliente", phone: clientPhone || null },
      create: { telegramId: BigInt(userId), firstName: clientName || "Cliente", phone: clientPhone || null }
    });

    // 2. Crear viaje en DB
    const ride = await prisma.ride.create({
      data: {
        clientId: BigInt(userId),
        clientName: clientName || "Cliente",
        clientPhone: clientPhone || "No registrado",
        pickupAddress: pickup,
        dropoffAddress: dropoff,
        pickupLat: pickupCoords[0],
        pickupLng: pickupCoords[1],
        dropoffLat: dropoffCoords[0],
        dropoffLng: dropoffCoords[1],
        fare: fare,
        distance: distance,
        status: "pending"
      }
    });

    // 3. Preparar mensaje para el grupo
    let groupId = (process.env.DRIVER_GROUP_ID || "").trim();
    
    // Corrección automática de ID de Supergrupo (-37... -> -10037...)
    if (groupId.startsWith("-") && !groupId.startsWith("-100") && groupId.length > 5) {
      groupId = `-100${groupId.substring(1)}`;
    }

    const bot = getBot();
    const mapUrl = `https://www.google.com/maps/dir/${pickupCoords[0]},${pickupCoords[1]}/${dropoffCoords[0]},${dropoffCoords[1]}`;
    const kb = new InlineKeyboard().text("🛵 Aceptar Viaje", `driver:accept:${ride.id}`);
    
    const messageText = 
      `🚨 <b>¡NUEVO VIAJE DISPONIBLE!</b> 🛵\n` +
      `───────────────────\n` +
      `👤 <b>Cliente:</b> ${clientName}\n` +
      `📞 <b>Teléfono:</b> <code>${clientPhone || "No registrado"}</code>\n\n` +
      `🏠 <b>Origen:</b> <code>${pickup}</code>\n` +
      `🎯 <b>Destino:</b> <code>${dropoff}</code>\n` +
      `📏 <b>Distancia:</b> ${distance.toFixed(2)} km\n` +
      `💰 <b>TARIFA: ${fare} CUP</b>\n` +
      `───────────────────\n` +
      `📍 <a href="${mapUrl}">Ver ruta en Google Maps</a>`;

    try {
      await bot.api.sendMessage(groupId, messageText, { 
        parse_mode: "HTML", 
        reply_markup: kb 
      });
    } catch (err: any) {
      console.error("Error al enviar mensaje al grupo:", err.message);
      // Si falla, intentamos una vez más asegurando el prefijo -100
      if (!groupId.startsWith("-100")) {
        const fallbackId = groupId.startsWith("-") ? `-100${groupId.substring(1)}` : `-100${groupId}`;
        await bot.api.sendMessage(fallbackId, messageText, { 
          parse_mode: "HTML", 
          reply_markup: kb 
        }).catch(e => console.error("Fallo total de envío:", e.message));
      }
    }

    return NextResponse.json({ ok: true, rideId: ride.id });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
