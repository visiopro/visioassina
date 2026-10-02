export const brl = (centavos: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);
export const data = (iso: string | null | undefined) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
export const dataHora = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "—";
export const hojeBR = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
export const soDigitos = (s: string) => (s ?? "").replace(/\D/g, "");
export const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? "https://assina.visiopro.app.br").replace(/\/$/, "");
export const linkContrato = (token: string) => `${appUrl()}/c/${token}`;
export const linkVerificacao = () => `${appUrl()}/v`;
