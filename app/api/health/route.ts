export async function GET() {
  return Response.json({
    service: "SecureGuard-LM IQ",
    status: "ready",
    dataMode: "synthetic-only",
  });
}
