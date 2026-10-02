/** Modelo de contrato: campos variáveis e preenchimento do texto */
export type TipoCampo = "texto" | "cnpj" | "cpf" | "email" | "telefone" | "moeda" | "data" | "numero";
export type QuemPreenche = "voce" | "cliente";

export type Campo = {
  chave: string;      // usada como {{chave}} no corpo
  rotulo: string;
  tipo: TipoCampo;
  quem: QuemPreenche;
  obrigatorio: boolean;
};

export const TIPOS: Record<TipoCampo, string> = {
  texto: "Texto",
  cnpj: "CNPJ",
  cpf: "CPF",
  email: "E-mail",
  telefone: "Telefone",
  moeda: "Valor em reais",
  data: "Data",
  numero: "Número",
};

export const soDigitos = (v: string) => (v ?? "").replace(/\D/g, "");

export function formatarValor(tipo: TipoCampo, valor: string): string {
  const v = (valor ?? "").trim();
  if (!v) return "";
  const d = soDigitos(v);
  switch (tipo) {
    case "cnpj":
      return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : v;
    case "cpf":
      return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : v;
    case "telefone":
      return d.length >= 10 ? `(${d.slice(-11, -9) || d.slice(0, 2)}) ${d.slice(-9, -4)}-${d.slice(-4)}` : v;
    case "moeda": {
      const n = Number(v.replace(/\./g, "").replace(",", "."));
      return Number.isFinite(n) ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : v;
    }
    case "data":
      return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split("-").reverse().join("/") : v;
    default:
      return v;
  }
}

/** Troca {{chave}} pelos valores; o que faltar vira ____ */
export function preencher(corpo: string, campos: Campo[], valores: Record<string, string>) {
  return corpo.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, chave: string) => {
    const campo = campos.find((c) => c.chave === chave);
    const valor = valores[chave];
    if (!valor) return "__________";
    return campo ? formatarValor(campo.tipo, valor) : valor;
  });
}

/** Variáveis citadas no corpo que não existem na lista de campos */
export function variaveisOrfas(corpo: string, campos: Campo[]) {
  const usadas = [...corpo.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map((m) => m[1]);
  return [...new Set(usadas.filter((u) => !campos.some((c) => c.chave === u)))];
}

export function faltamDoCliente(campos: Campo[], valores: Record<string, string>) {
  return campos.filter((c) => c.quem === "cliente" && c.obrigatorio && !valores[c.chave]?.trim());
}

/** CNPJ e CPF: validação dos dígitos verificadores */
export function documentoValido(tipo: "cnpj" | "cpf", valor: string) {
  const d = soDigitos(valor);
  if (tipo === "cpf") {
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    const calc = (ate: number) => {
      let soma = 0;
      for (let i = 0; i < ate; i++) soma += Number(d[i]) * (ate + 1 - i);
      const r = (soma * 10) % 11;
      return r === 10 ? 0 : r;
    };
    return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
  }
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (ate: number) => {
    const pesos = ate === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * pesos[i];
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}
