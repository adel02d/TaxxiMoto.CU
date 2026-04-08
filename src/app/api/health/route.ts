export async function GET() {
  return new Response(
    JSON.stringify({ status: "ok", service: "TaxiMotos.CU" }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
