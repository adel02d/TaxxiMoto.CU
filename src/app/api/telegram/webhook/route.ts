import { webhookCallback } from "grammy";
import { getBot } from "@/lib/bot";

export async function POST(request: Request) {
  try {
    const bot = getBot();
    const handleUpdate = webhookCallback(bot, "std/http");
    return await handleUpdate(request);
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Error", { status: 500 });
  }
}

export async function GET() {
  return new Response("TaxiMotos.CU webhook is running", { status: 200 });
}
