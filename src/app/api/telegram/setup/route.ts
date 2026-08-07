import { NextResponse } from "next/server";
import { getBot } from "../../../../lib/bot";

export async function GET(request: Request) {
  try {
    const bot = getBot();
    const url = new URL(request.url);
    
    const host = request.headers.get("host") || url.host;
    const protocol = host.includes("localhost") ? "http" : "https";
    const webhookUrl = `${protocol}://${host}/api/telegram/webhook`;

    await bot.api.setWebhook(webhookUrl, {
      drop_pending_updates: true,
      allowed_updates: ["message", "callback_query", "chat_member"],
    });

    const info = await bot.api.getWebhookInfo();

    return NextResponse.json({
      ok: true,
      message: "Configuración de Telegram actualizada",
      url_registrada: webhookUrl,
      info_actual_en_telegram: info
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
