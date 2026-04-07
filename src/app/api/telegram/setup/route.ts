import { NextResponse } from "next/server";
import { getBot } from "@/lib/bot";

export async function GET(request: Request) {
  try {
    const bot = getBot();
    const url = new URL(request.url);
    const webhookUrl = `${url.origin}/api/telegram/webhook`;

    await bot.api.setWebhook(webhookUrl, {
      drop_pending_updates: true,
    });

    return NextResponse.json({
      ok: true,
      message: "Webhook registrado correctamente",
      webhookUrl: webhookUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
