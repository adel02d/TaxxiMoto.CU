import { Bot, InlineKeyboard, Context } from "grammy";
import prisma from "./prisma";

let bot: Bot | null = null;

function getBot(): Bot {
  if (!bot) {
    const token = process.env.BOT_TOKEN?.trim() || "";
    if (!token) throw new Error("BOT_TOKEN no está configurado");
    bot = new Bot(token);
    registerBotHandlers(bot);
  }
  return bot;
}

function registerBotHandlers(bot: Bot) {
  const ADMIN_IDS: bigint[] = (process.env.ADMIN_IDS || "")
    .replace(/["']/g, "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .map((id) => {
      try { return BigInt(id); } catch { return 0n; }
    })
    .filter((id) => id !== 0n);

  const DRIVER_GROUP_ID: string = (process.env.DRIVER_GROUP_ID || "").trim();

  function isAdmin(userId: number | bigint): boolean {
    return ADMIN_IDS.includes(BigInt(userId));
  }

  async function getPricePerKm(): Promise<number> {
    try {
      const setting = await prisma.setting.findUnique({ where: { key: "pricePerKm" } });
      return setting ? parseFloat(setting.value) : 300;
    } catch { return 300; }
  }

  async function ensureUser(ctx: Context) {
    try {
      const user = ctx.from;
      if (!user) return;
      const telegramId = BigInt(user.id);
      await prisma.user.upsert({
        where: { telegramId },
        update: { firstName: user.first_name, lastName: user.last_name || null, username: user.username || null },
        create: { telegramId, firstName: user.first_name, lastName: user.last_name || null, username: user.username || null },
      });
    } catch (e) { console.error("Error ensureUser:", e); }
  }

  function mainMenuKeyboard(role: "admin" | "driver" | "client"): InlineKeyboard {
    const kb = new InlineKeyboard();
    const baseUrl = "https://taxximoto-cu.onrender.com";

    if (role === "admin") {
      return kb
        .webApp("👑 Abrir Panel Admin", `${baseUrl}/admin`)
        .row()
        .text("📊 Stats Rápidas", "admin:stats")
        .text("🏍️ Choferes", "admin:drivers")
        .row()
        .text("📢 Enviar Anuncio", "admin:broadcast")
        .row()
        .text("🛵 Menú Cliente", "action:client_menu");
    } else if (role === "driver") {
      return kb
        .webApp("🏍️ Abrir Panel Trabajo", `${baseUrl}/driver`)
        .row()
        .text("📜 Reglas", "driver:rules")
        .text("🏁 Mis Viajes", "driver:history")
        .row()
        .text("🛵 Menú Cliente", "action:client_menu");
    }
    return kb
      .webApp("🛵 Solicitar Moto", `${baseUrl}`)
      .row()
      .text("🎫 Mis Viajes", "action:my_rides")
      .text("❓ Ayuda", "action:support")
      .row()
      .url("📢 Recomendar Bot", `https://t.me/share/url?url=https://t.me/TaxiMotoCUBot&text=¡Mira! Estoy usando TaxiMotos.CU para moverme rápido y seguro por la ciudad. 🛵💨`);
  }

  bot.on("message:new_chat_members", async (ctx) => {
    if (ctx.chat.id.toString().includes(DRIVER_GROUP_ID.replace("-100", ""))) {
      for (const member of ctx.message.new_chat_members) {
        if (member.is_bot) continue;
        try {
          await prisma.driver.upsert({
            where: { telegramId: BigInt(member.id) },
            update: { isActive: true },
            create: { telegramId: BigInt(member.id), firstName: member.first_name, isActive: true, freeRidesLeft: 5 }
          });
          const baseUrl = "https://taxximoto-cu.onrender.com";
          const kb = new InlineKeyboard().webApp("🏍️ Mi Panel", `${baseUrl}/driver`);
          await ctx.reply(`👋 <b>¡Bienvenido ${member.first_name}!</b>\n\n🏍️ Has sido registrado. Tienes 5 viajes gratis.\n👇 Pulsa abajo para ver tu panel:`, { parse_mode: "HTML", reply_markup: kb });
        } catch (e) { console.error(e); }
      }
    }
  });

  bot.command(["start", "menu"], async (ctx) => {
    await ensureUser(ctx);
    const userId = ctx.from!.id;
    const admin = isAdmin(userId);
    const driver = await prisma.driver.findUnique({ where: { telegramId: BigInt(userId) } }).catch(() => null);

    if (admin) {
      await ctx.reply("👑 <b>PANEL ADMIN</b>\nBienvenido jefe. Gestiona la flota desde aquí.", { parse_mode: "HTML", reply_markup: mainMenuKeyboard("admin") });
    } else if (driver) {
      await ctx.reply(`🏍️ <b>PANEL CONDUCTOR</b>\nHola ${driver.firstName}. Gestiona tus pagos e historial.`, { parse_mode: "HTML", reply_markup: mainMenuKeyboard("driver") });
    } else {
      await ctx.reply(
        "🛵 <b>¡Bienvenido a TaxiMotos.CU!</b> 🛵\n\n" +
        "Tu servicio más <b>rápido y seguro</b>. ⚡️\n\n" +
        "👇 <b>Selecciona una opción:</b>",
        { parse_mode: "HTML", reply_markup: mainMenuKeyboard("client") }
      );
    }
  });

  bot.callbackQuery("action:my_rides", async (ctx) => {
    await ctx.answerCallbackQuery();
    const rides = await prisma.ride.findMany({ where: { clientId: BigInt(ctx.from!.id) }, orderBy: { createdAt: "desc" }, take: 5 });
    if (rides.length === 0) return ctx.reply("Aún no tienes viajes registrados.");
    const list = rides.map(r => `• #${r.id}: ${r.fare} CUP - <b>${r.status.toUpperCase()}</b>`).join("\n");
    await ctx.reply(`🎫 <b>Tus últimos 5 viajes:</b>\n\n${list}`, { parse_mode: "HTML" });
  });

  bot.callbackQuery("driver:history", async (ctx) => {
    await ctx.answerCallbackQuery();
    const rides = await prisma.ride.findMany({ where: { driverId: BigInt(ctx.from!.id) }, orderBy: { createdAt: "desc" }, take: 10 });
    if (rides.length === 0) return ctx.reply("Aún no has realizado viajes.");
    const list = rides.map(r => `✅ #${r.id}: ${r.fare} CUP (${r.status})`).join("\n");
    await ctx.reply(`🏁 <b>Tus últimos 10 viajes:</b>\n${list}`, { parse_mode: "HTML" });
  });

  bot.callbackQuery(/^driver:accept:(\d+)$/, async (ctx) => {
    const rideId = parseInt(ctx.match![1]);
    const driverId = ctx.from!.id;
    try {
      let driver = await prisma.driver.findUnique({ where: { telegramId: BigInt(driverId) } });
      if (!driver && isAdmin(driverId)) {
        driver = await prisma.driver.upsert({
          where: { telegramId: BigInt(driverId) },
          update: { isActive: true },
          create: { telegramId: BigInt(driverId), firstName: ctx.from!.first_name, isActive: true, freeRidesLeft: 99 }
        });
      }
      if (!driver) return await ctx.answerCallbackQuery({ text: "❌ No eres conductor. Escribe /socio", show_alert: true });
      
      const ride = await prisma.ride.findUnique({ where: { id: rideId } });
      if (!ride || ride.status !== "pending") {
        await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
        return await ctx.answerCallbackQuery({ text: "⚠️ Ya aceptado por otro.", show_alert: true });
      }

      await ctx.answerCallbackQuery("✅ Viaje aceptado");
      let commission = 0;
      if (driver.freeRidesLeft > 0) {
        await prisma.driver.update({ where: { telegramId: BigInt(driverId) }, data: { freeRidesLeft: { decrement: 1 } } });
      } else {
        commission = Math.round((ride.fare || 0) * 0.10);
        await prisma.driver.update({ where: { telegramId: BigInt(driverId) }, data: { debt: { increment: commission } } });
      }

      await prisma.ride.update({ where: { id: rideId }, data: { driverId: BigInt(driverId), driverName: driver.firstName, status: "assigned" } });
      await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
      await bot.api.sendMessage(ride.clientId.toString(), `🎉 <b>¡Conductor asignado!</b> ${driver.firstName} va en camino.`);
      const kb = new InlineKeyboard().text("🏁 Iniciar Viaje", `driver:start:${rideId}`);
      await ctx.reply(`✅ Has aceptado el viaje #${rideId}.`, { reply_markup: kb });
    } catch (e) { console.error(e); }
  });

  bot.callbackQuery(/^driver:start:(\d+)$/, async (ctx) => {
    const rideId = parseInt(ctx.match![1]);
    const ride = await prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride || ride.status !== "assigned") return await ctx.answerCallbackQuery("⚠️ Ya iniciado.");
    
    await ctx.answerCallbackQuery("🏁 Viaje iniciado");
    await prisma.ride.update({ where: { id: rideId }, data: { status: "in_progress" } });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    await bot.api.sendMessage(ride.clientId.toString(), "🏁 <b>¡El viaje ha comenzado!</b>", { parse_mode: "HTML" }).catch(() => {});
    const kb = new InlineKeyboard().text("✅ Finalizar Viaje", `driver:finish:${rideId}`);
    await ctx.reply(`🏁 Viaje #${rideId} en curso`, { reply_markup: kb });
  });

  bot.callbackQuery(/^driver:finish:(\d+)$/, async (ctx) => {
    const rideId = parseInt(ctx.match![1]);
    const driverId = ctx.from!.id;
    const ride = await prisma.ride.findUnique({ where: { id: rideId } });
    
    if (!ride || ride.status === "completed") {
        await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
        return await ctx.answerCallbackQuery("⚠️ Ya finalizado.");
    }

    await ctx.answerCallbackQuery("✅ Viaje completado");
    await prisma.ride.update({ where: { id: rideId }, data: { status: "completed", completedAt: new Date() } });
    await prisma.driver.update({ where: { telegramId: BigInt(driverId) }, data: { totalRides: { increment: 1 }, totalEarnings: { increment: ride.fare || 0 } } });
    
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    await bot.api.sendMessage(ride.clientId.toString(), `✅ <b>¡Viaje completado!</b>\n💰 Total: ${ride.fare} CUP\n\nGracias por elegir TaxiMotos.CU`, { parse_mode: "HTML" }).catch(() => {});
    await ctx.reply(`✅ Viaje #${rideId} finalizado.`, { reply_markup: mainMenuKeyboard("driver") });
  });

  bot.on("message:web_app_data", async (ctx) => {
    try {
      const data = JSON.parse(ctx.message.web_app_data.data);
      const userId = ctx.from!.id;
      const ride = await prisma.ride.create({
        data: {
          clientId: BigInt(userId), clientName: data.clientName || ctx.from!.first_name, clientPhone: data.clientPhone,
          pickupAddress: data.pickup, dropoffAddress: data.dropoff,
          pickupLat: data.pickupCoords[0], pickupLng: data.pickupCoords[1],
          dropoffLat: data.dropoffCoords[0], dropoffLng: data.dropoffCoords[1],
          fare: data.fare, distance: data.distance, status: "pending"
        }
      });
      await ctx.reply(`✅ <b>Solicitud #${ride.id} enviada.</b> Buscando conductor...`, { parse_mode: "HTML" });
      if (DRIVER_GROUP_ID) {
        const kb = new InlineKeyboard().text("🛵 Aceptar Viaje", `driver:accept:${ride.id}`);
        await bot.api.sendMessage(DRIVER_GROUP_ID, `🚨 <b>NUEVO VIAJE!</b> #${ride.id}\n👤 ${ride.clientName}\n📞 ${ride.clientPhone}\n💰 <b>${ride.fare} CUP</b>\n📏 ${ride.distance?.toFixed(2)} km`, { parse_mode: "HTML", reply_markup: kb }).catch(console.error);
      }
    } catch (e) { console.error(e); }
  });

  bot.catch((err) => console.error("Bot error:", err));
}

export { getBot };
