import "server-only";

/** IP de quem chamou, atrás do proxy da Vercel */
export const ipDaRequisicao = (req: Request) =>
  (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || null;
