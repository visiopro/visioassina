import Link from "next/link";
import { redirect } from "next/navigation";
import { Marca } from "@/components/marca";
import { Botao, Campo, Cartao } from "@/components/ui";

export const metadata = { title: "Verificar documento · VisioPro Assina" };

/** Consulta pública: confere se um documento assinado é autêntico */
export default async function Verificar({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const { codigo } = await searchParams;
  const limpo = (codigo ?? "").trim().toUpperCase();
  if (/^[A-Z0-9]{6,16}$/.test(limpo)) redirect(`/v/${limpo}`);
  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-16 pt-16">
      <header className="mb-6 flex items-center gap-3">
        <Marca className="h-9 w-9" />
        <div>
          <p className="font-semibold leading-tight">Verificar documento</p>
          <p className="text-sm text-nevoa">VisioPro Assina</p>
        </div>
      </header>
      <Cartao className="p-5">
        <form action="/v" className="space-y-4">
          <Campo rotulo="Código de verificação" ajuda="Está no comprovante, no fim do PDF.">
            <input name="codigo" required className="campo uppercase tracking-wider" placeholder="A1B2C3D4E5" />
          </Campo>
          <Botao className="w-full">Verificar</Botao>
        </form>
      </Cartao>
      <p className="mt-6 text-center text-xs text-nevoa">
        <Link href="/" className="hover:text-texto">
          VisioPro Assina
        </Link>
      </p>
    </main>
  );
}
