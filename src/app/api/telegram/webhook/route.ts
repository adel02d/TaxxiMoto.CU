import { webhookCallback } from "grammy";
import bot from "@/lib/bot";

const handleUpdate = webhookCallback(bot, "std/http");

export async function POST(request: Request) {
  try {
    return await handleUpdate(request);
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Error", { status: 500 });
  }
}

export async function GET() {
  return new Response("TaxiMotos.CU webhook is running", { status: 200 });
}
