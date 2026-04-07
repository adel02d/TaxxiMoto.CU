import { Bot, InlineKeyboard, Context } from "grammy";
import prisma from "./prisma";

let bot: Bot | null = null;

function getBot(): Bot {
  if (!bot) {
    const token = process.env.BOT_TOKEN || "";
    if (!token) throw new Error("BOT_TOKEN no está configurado");
    bot = new Bot(token);
    registerBotHandlers(bot);
  }
  return bot;
}

function registerBotHandlers(bot: Bot) {
  const ADMIN_IDS: number[] = (process.env.ADMIN_IDS || "")
    .split(",")
    .map((id) => parseInt(id.trim()))
    .filter((id) => !isNaN(id));

  const DRIVER_GROUP_ID: string = process.env.DRIVER_GROUP_ID || "";

  function isAdmin(userId: number): boolean {
    return ADMIN_IDS.includes(userId);
  }

  async function ensureUser(ctx: Context): Promise<any> {
    const user = ctx.from!;
    return await prisma.user.upsert({
      where: { telegramId: user.id },
      update: {
        firstName: user.first_name,
        lastName: user.last_name || null,
        username: user.username || null,
      },
      create: {
        telegramId: user.id,
        firstName: user.first_name,
        lastName: user.last_name || null,
        username: user.username || null,
      },
    });
  }

  function mainMenuKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
      .text("🛵 Solicitar Moto", "action:request")
      .text("🎫 Mis Viajes", "action:my_rides")
      .row()
      .text("📋 Mis Datos", "action:my_data")
      .text("📞 Soporte", "action:support");
  }

  bot.command("start", async (ctx) => {
    await ensureUser(ctx);
    await ctx.reply(
      "🛵 *Bienvenido a TaxiMotos\\.CU\\!*\n\nTu servicio de mototaxi rápido y seguro\\.\n\nSelecciona una opción del menú:",
      { parse_mode: "MarkdownV2", reply_markup: mainMenuKeyboard() }
    );
  });

  bot.command("menu", async (ctx) => {
    await ctx.reply("📋 *Menú Principal*:", {
      parse_mode: "MarkdownV2",
      reply_markup: mainMenuKeyboard(),
    });
  });

  const pendingRides = new Map<number, {
    step: "pickup" | "dropoff" | "confirm";
    pickupAddress?: string;
    pickupLat?: number;
    pickupLng?: number;
    dropoffAddress?: string;
  }>();

  bot.callbackQuery("action:request", async (ctx) => {
    await ctx.answerCallbackQuery();
    pendingRides.set(ctx.from!.id, { step: "pickup" });
    await ctx.reply(
      "📍 *Paso 1:* Envíame tu ubicación de recogida\\.\n\n👉 Usa el clip 📎 \\→ Ubicación",
      { parse_mode: "MarkdownV2" }
    );
  });

  bot.on("message:location", async (ctx) => {
    const userId = ctx.from!.id;
    const pending = pendingRides.get(userId);
    if (!pending) {
      await ctx.reply("⚠️ No tienes solicitud activa\\. Usa /menu para empezar\\.");
      return;
    }
    const loc = ctx.message.location!;
    const lat = loc.latitude;
    const lng = loc.longitude;

    if (pending.step === "pickup") {
      pending.pickupLat = lat;
      pending.pickupLng = lng;
      pending.pickupAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      pending.step = "dropoff";
      await ctx.reply(
        "📍 *Paso 2:* ¿A dónde vas?\n\nEnvíame la ubicación de destino o escribe la dirección:",
        { parse_mode: "MarkdownV2" }
      );
    } else if (pending.step === "dropoff") {
      pending.dropoffAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      pending.step = "confirm";
      const kb = new InlineKeyboard()
        .text("✅ Confirmar Solicitud", "action:confirm_ride")
        .text("❌ Cancelar", "action:cancel_ride");
      await ctx.reply(
        "🛵 *Confirma tu solicitud:*\\n\\n" +
        `🏠 Recogida: ${pending.pickupAddress}\n🎯 Destino: ${pending.dropoffAddress}\n\n¿Confirmas?`,
        { parse_mode: "MarkdownV2", reply_markup: kb }
      );
    }
  });

  bot.on("message:text", async (ctx) => {
    const userId = ctx.from!.id;
    const text = ctx.message.text;
    const pending = pendingRides.get(userId);

    if (pending && pending.step === "dropoff") {
      pending.dropoffAddress = text;
      pending.step = "confirm";
      const kb = new InlineKeyboard()
        .text("✅ Confirmar Solicitud", "action:confirm_ride")
        .text("❌ Cancelar", "action:cancel_ride");
      await ctx.reply(
        "🛵 *Confirma tu solicitud:*\\n\\n" +
        `🏠 Recogida: ${pending.pickupAddress}\n🎯 Destino: ${text}\n\n¿Confirmas?`,
        { parse_mode: "MarkdownV2", reply_markup: kb }
      );
      return;
    }

    if (text.toLowerCase() === "soporte" || text === "/soporte") {
      await ctx.reply(
        "📞 *Soporte TaxiMotos\\.CU*\n\nEscribe tu consulta y un administrador te ayudará\\.",
        { parse_mode: "MarkdownV2" }
      );
    }
  });

  bot.callbackQuery("action:confirm_ride", async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = ctx.from!.id;
    const pending = pendingRides.get(userId);
    if (!pending || !pending.pickupAddress) {
      await ctx.reply("⚠️ No hay solicitud pendiente\\.");
      return;
    }
    const user = await prisma.user.findUnique({ where: { telegramId: userId } });
    const ride = await prisma.ride.create({
      data: {
        clientId: userId,
        clientName: user?.firstName || "Cliente",
        clientPhone: user?.phone || null,
        pickupAddress: pending.pickupAddress,
        pickupLat: pending.pickupLat,
        pickupLng: pending.pickupLng,
        dropoffAddress: pending.dropoffAddress || null,
        status: "pending",
      },
    });
    pendingRides.delete(userId);

    await ctx.reply(
      "✅ *¡Solicitud enviada\\!*\\n\\n" +
      `🎫 Ticket #${ride.id}\n🏠 Recogida: ${ride.pickupAddress}\n` +
      `🎯 Destino: ${ride.dropoffAddress || "No especificado"}\n\n` +
      "⏳ Buscando conductor\\.\\.\\.\n\nUsa 🎫 Mis Viajes para ver el estado\\.",
      { parse_mode: "MarkdownV2" }
    );

    if (DRIVER_GROUP_ID) {
      const kb = new InlineKeyboard().text("🛵 Aceptar Viaje", `driver:accept:${ride.id}`);
      try {
        await bot.api.sendMessage(
          DRIVER_GROUP_ID,
          "🚨 *¡Nuevo Viaje Disponible\\!*\\n\\n" +
          `🎫 Ticket #${ride.id}\n👤 Cliente: ${ride.clientName}\n` +
          `📞 Tel: ${ride.clientPhone || "No disponible"}\n` +
          `🏠 Recogida: ${ride.pickupAddress}\n🎯 Destino: ${ride.dropoffAddress || "No especificado"}`,
          { parse_mode: "MarkdownV2", reply_markup: kb }
        );
      } catch (error) {
        console.error("Error enviando al grupo:", error);
      }
    }
  });

  bot.callbackQuery("action:cancel_ride", async (ctx) => {
    await ctx.answerCallbackQuery();
    pendingRides.delete(ctx.from!.id);
    await ctx.reply("❌ Solicitud cancelada\\.", {
      parse_mode: "MarkdownV2", reply_markup: mainMenuKeyboard(),
    });
  });

  bot.callbackQuery(/^driver:accept:(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const rideId = parseInt(ctx.match![1]);
    const driverTelegramId = ctx.from!.id;
    const ride = await prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride || ride.status !== "pending") {
      await ctx.reply("⚠️ Este viaje ya no está disponible\\.");
      return;
    }
    const driver = await prisma.driver.findUnique({ where: { telegramId: driverTelegramId } });
    if (!driver || !driver.isActive) {
      await ctx.reply("⚠️ No estás registrado como conductor activo\\. Un administrador debe registrarte\\.");
      return;
    }
    await prisma.ride.update({
      where: { id: rideId },
      data: {
        driverId: driverTelegramId,
        driverName: `${driver.firstName}${driver.lastName ? " " + driver.lastName : ""}`,
        status: "assigned",
      },
    });
    await prisma.driver.update({ where: { telegramId: driverTelegramId }, data: { status: "busy" } });
    await bot.api.sendMessage(
      ride.clientId,
      "🎉 *¡Conductor asignado\\!*\\n\\n" +
      `🛵 Conductor: ${driver.firstName}${driver.lastName ? " " + driver.lastName : ""}\n` +
      `📞 Tel: ${driver.phone || "No disponible"}\n🏍️ Moto: ${driver.motorcyclePlate || "N/A"}\n\n` +
      "⏳ El conductor está en camino\\.\\.\\.",
      { parse_mode: "MarkdownV2" }
    );
    const kb = new InlineKeyboard()
      .text("🏁 Iniciar Viaje", `driver:start:${rideId}`)
      .text("❌ Cancelar Viaje", `driver:cancel_ride:${rideId}`);
    await ctx.reply(
      `✅ *¡Viaje #${rideId} aceptado\\!*\\n\\n` +
      `👤 Cliente: ${ride.clientName}\n📞 ${ride.clientPhone || "Sin teléfono"}\n` +
      `🏠 ${ride.pickupAddress}\n🎯 ${ride.dropoffAddress || "No especificado"}\n\n` +
      "Presiona 🏁 cuando llegues a recoger al cliente\\.",
      { parse_mode: "MarkdownV2", reply_markup: kb }
    );
  });

  bot.callbackQuery(/^driver:start:(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const rideId = parseInt(ctx.match![1]);
    await prisma.ride.update({ where: { id: rideId }, data: { status: "in_progress" } });
    const ride = await prisma.ride.findUnique({ where: { id: rideId } });
    if (ride) {
      await bot.api.sendMessage(
        ride.clientId,
        "🏁 *¡El viaje ha comenzado\\!*\\n\nEl conductor está en camino\\.\n\n¡Buen viaje\\! 🛵",
        { parse_mode: "MarkdownV2" }
      );
    }
    const kb = new InlineKeyboard().text("✅ Finalizar Viaje", `driver:finish:${rideId}`);
    await ctx.reply(
      `🏁 *Viaje #${rideId} en curso*\\n\nPresiona ✅ cuando llegues al destino\\.`,
      { parse_mode: "MarkdownV2", reply_markup: kb }
    );
  });

  bot.callbackQuery(/^driver:finish:(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const rideId = parseInt(ctx.match![1]);
    const driverTelegramId = ctx.from!.id;
    const ride = await prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) return;
    const fare = 500;
    await prisma.ride.update({
      where: { id: rideId }, data: { status: "completed", fare: fare, completedAt: new Date() },
    });
    await prisma.payment.create({
      data: { rideId, amount: fare, method: "cash", status: "completed", paidAt: new Date() },
    });
    await prisma.driver.update({
      where: { telegramId: driverTelegramId },
      data: { status: "available", totalRides: { increment: 1 }, totalEarnings: { increment: fare } },
    });
    const kb = new InlineKeyboard()
      .text("⭐⭐⭐⭐⭐ Excelente", `rate:5:${rideId}`)
      .text("⭐⭐⭐⭐ Bien", `rate:4:${rideId}`)
      .row()
      .text("⭐⭐⭐ Regular", `rate:3:${rideId}`)
      .text("⭐⭐ Malo", `rate:2:${rideId}`)
      .row()
      .text("⭐ Pésimo", `rate:1:${rideId}`);
    await bot.api.sendMessage(
      ride.clientId,
      "✅ *¡Viaje completado\\!*\\n\\n" +
      `🎫 Ticket #${rideId}\n💰 Tarifa: ${fare} CUP\n💵 Método: Efectivo\n\n¿Cómo calificas el servicio?`,
      { parse_mode: "MarkdownV2", reply_markup: kb }
    );
    await ctx.reply(
      `✅ *Viaje #${rideId} completado\\!*\\n\n💰 Ganancia: ${fare} CUP`,
      { parse_mode: "MarkdownV2", reply_markup: mainMenuKeyboard() }
    );
  });

  bot.callbackQuery(/^driver:cancel_ride:(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const rideId = parseInt(ctx.match![1]);
    const driverTelegramId = ctx.from!.id;
    await prisma.ride.update({
      where: { id: rideId }, data: { status: "pending", driverId: null, driverName: null },
    });
    await prisma.driver.update({ where: { telegramId: driverTelegramId }, data: { status: "available" } });
    const ride = await prisma.ride.findUnique({ where: { id: rideId } });
    if (ride && DRIVER_GROUP_ID) {
      const kb = new InlineKeyboard().text("🛵 Aceptar Viaje", `driver:accept:${ride.id}`);
      try {
        await bot.api.sendMessage(
          DRIVER_GROUP_ID,
          "🚨 *¡Viaje disponible nuevamente\\!*\\n\\n" +
          `🎫 Ticket #${ride.id}\n👤 Cliente: ${ride.clientName}\n` +
          `🏠 Recogida: ${ride.pickupAddress}\n🎯 Destino: ${ride.dropoffAddress || "No especificado"}`,
          { parse_mode: "MarkdownV2", reply_markup: kb }
        );
      } catch (error) { console.error("Error:", error); }
    }
    await ctx.reply("❌ Viaje cancelado\\.", {
      parse_mode: "MarkdownV2", reply_markup: mainMenuKeyboard(),
    });
  });

  bot.callbackQuery(/^rate:(\d):(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const rating = parseInt(ctx.match![1]);
    const rideId = parseInt(ctx.match![2]);
    const ride = await prisma.ride.findUnique({ where: { id: rideId } });
    if (ride?.driverId) {
      const driver = await prisma.driver.findUnique({ where: { telegramId: ride.driverId } });
      if (driver) {
        const newTotal = driver.rating * driver.totalRides + rating;
        const newCount = driver.totalRides + 1;
        await prisma.driver.update({
          where: { telegramId: ride.driverId }, data: { rating: newTotal / newCount },
        });
      }
    }
    await ctx.reply(
      "⭐ ¡Gracias por tu calificación\\!\n\nEsperamos verte pronto\\. 🛵",
      { parse_mode: "MarkdownV2", reply_markup: mainMenuKeyboard() }
    );
  });

  bot.callbackQuery("action:my_rides", async (ctx) => {
    await ctx.answerCallbackQuery();
    const rides = await prisma.ride.findMany({
      where: { clientId: ctx.from!.id }, orderBy: { createdAt: "desc" }, take: 5,
    });
    if (rides.length === 0) {
      await ctx.reply("📦 No tienes viajes registrados aún\\.");
      return;
    }
    const emoji: Record<string, string> = { pending: "⏳", assigned: "🛵", in_progress: "🏁", completed: "✅", cancelled: "❌" };
    const list = rides
      .map((r) =>
        `${emoji[r.status] || "📦"} *#${r.id}* \\- ${r.status.toUpperCase()}\n` +
        `   🏠 ${r.pickupAddress}\n   🎯 ${r.dropoffAddress || "—"}\n` +
        `   💰 ${r.fare ? r.fare + " CUP" : "—"}\n   📅 ${r.createdAt.toLocaleDateString("es-CU")}\n`
      )
      .join("\n");
    await ctx.reply(`🎫 *Tus últimos viajes:*\\n\n${list}\n\nUsa /menu para volver\\.`, {
      parse_mode: "MarkdownV2",
    });
  });

  bot.callbackQuery("action:my_data", async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = await prisma.user.findUnique({ where: { telegramId: ctx.from!.id } });
    if (!user) { await ctx.reply("⚠️ No tienes datos registrados\\."); return; }
    await ctx.reply(
      "👤 *Mis Datos:*\\n\\n" +
      `🆔 ID: ${user.telegramId}\n📛 Nombre: ${user.firstName} ${user.lastName || ""}\n` +
      `📱 Teléfono: ${user.phone || "No registrado"}\n🎫 Rol: ${user.role}`,
      { parse_mode: "MarkdownV2" }
    );
  });

  bot.callbackQuery("action:support", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply("📞 *Soporte TaxiMotos\\.CU*\n\nEscribe tu consulta y un administrador te ayudará\\.", {
      parse_mode: "MarkdownV2",
    });
  });

  bot.command("add_driver", async (ctx) => {
    if (!isAdmin(ctx.from!.id)) { await ctx.reply("⚠️ Solo administradores\\."); return; }
    const args = ctx.message!.text!.split(" ").slice(1);
    if (args.length < 1) {
      await ctx.reply("⚠️ Uso: /add\\_driver \\<ID\\> \\<nombre\\> \\<tel\\> \\<matrícula\\>\nEjemplo: /add\\_driver 123456789 Juan 5551234 M\\-12345", {
        parse_mode: "MarkdownV2",
      });
      return;
    }
    try {
      const driver = await prisma.driver.upsert({
        where: { telegramId: parseInt(args[0]) },
        update: { firstName: args[1] || "Conductor", phone: args[2] || undefined, motorcyclePlate: args[3] || undefined, isActive: true },
        create: { telegramId: parseInt(args[0]), firstName: args[1] || "Conductor", phone: args[2] || undefined, motorcyclePlate: args[3] || undefined },
      });
      await ctx.reply(
        `✅ *Conductor registrado:*\\n\\n🆔 ${driver.telegramId}\n📛 ${driver.firstName}\n📱 ${driver.phone || "—"}\n🏍️ ${driver.motorcyclePlate || "—"}`,
        { parse_mode: "MarkdownV2" }
      );
    } catch (e: any) { await ctx.reply(`❌ Error: ${e.message}`); }
  });

  bot.command("remove_driver", async (ctx) => {
    if (!isAdmin(ctx.from!.id)) { await ctx.reply("⚠️ Solo administradores\\."); return; }
    const args = ctx.message!.text!.split(" ").slice(1);
    if (args.length < 1) { await ctx.reply("⚠️ Uso: /remove\\_driver \\<ID\\>", { parse_mode: "MarkdownV2" }); return; }
    try {
      await prisma.driver.update({ where: { telegramId: parseInt(args[0]) }, data: { isActive: false } });
      await ctx.reply(`✅ Conductor ${args[0]} desactivado\\.`);
    } catch (e: any) { await ctx.reply(`❌ Error: ${e.message}`); }
  });

  bot.command("drivers", async (ctx) => {
    if (!isAdmin(ctx.from!.id)) { await ctx.reply("⚠️ Solo administradores\\."); return; }
    const drivers = await prisma.driver.findMany({ where: { isActive: true }, orderBy: { totalRides: "desc" } });
    if (drivers.length === 0) { await ctx.reply("📭 No hay conductores\\."); return; }
    const emoji: Record<string, string> = { available: "🟢", busy: "🔴", offline: "⚫" };
    const list = drivers
      .map((d) =>
        `${emoji[d.status] || "⚫"} *${d.firstName} ${d.lastName || ""}*\n` +
        `   🆔 ${d.telegramId} | 📱 ${d.phone || "—"}\n` +
        `   🏍️ ${d.motorcyclePlate || "—"} | ⭐ ${d.rating.toFixed(1)}\n` +
        `   🚗 Viajes: ${d.totalRides} | 💰 ${d.totalEarnings} CUP`
      )
      .join("\n\n");
    await ctx.reply(`🏍️ *Conductores \\(${drivers.length}\\):*\\n\n${list}`, { parse_mode: "MarkdownV2" });
  });

  bot.command("stats", async (ctx) => {
    if (!isAdmin(ctx.from!.id)) { await ctx.reply("⚠️ Solo administradores\\."); return; }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [totalRides, todayRides, completedRides, pendingCount, totalEarnings, todayEarnings, activeDrivers] =
      await Promise.all([
        prisma.ride.count(),
        prisma.ride.count({ where: { createdAt: { gte: today } } }),
        prisma.ride.count({ where: { status: "completed" } }),
        prisma.ride.count({ where: { status: "pending" } }),
        prisma.ride.aggregate({ _sum: { fare: true }, where: { status: "completed" } }),
        prisma.ride.aggregate({ _sum: { fare: true }, where: { status: "completed", completedAt: { gte: today } } }),
        prisma.driver.count({ where: { isActive: true } }),
      ]);
    await ctx.reply(
      "📊 *Estadísticas\\:*\\n\n" +
      `🚗 Total: ${totalRides} | Hoy: ${todayRides}\n✅ Completados: ${completedRides} | ⏳ Pendientes: ${pendingCount}\n` +
      `💰 Ingresos: ${totalEarnings._sum.fare || 0} CUP | Hoy: ${todayEarnings._sum.fare || 0} CUP\n` +
      `🏍️ Conductores: ${activeDrivers}`,
      { parse_mode: "MarkdownV2" }
    );
  });

  bot.command("broadcast", async (ctx) => {
    if (!isAdmin(ctx.from!.id)) { await ctx.reply("⚠️ Solo administradores\\."); return; }
    const text = ctx.message!.text!.split(" ").slice(1).join(" ");
    if (!text) { await ctx.reply("⚠️ Uso: /broadcast \\<mensaje\\>"); return; }
    const users = await prisma.user.findMany({ select: { telegramId: true } });
    let sent = 0;
    for (const user of users) {
      try { await bot.api.sendMessage(user.telegramId, `📢 *Anuncio:*\n\n${text}`, { parse_mode: "MarkdownV2" }); sent++; }
      catch { /* bloqueado */ }
    }
    await ctx.reply(`📢 Enviado a ${sent}/${users.length} usuarios\\.`);
  });

  bot.catch((err) => console.error("Bot error:", err));
}

export { getBot };
