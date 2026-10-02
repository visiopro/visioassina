import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 text-center">
      <div>
        <p className="text-xl font-semibold">Página não encontrada</p>
        <p className="mt-1 text-sm text-nevoa">O link pode ter expirado ou estar incompleto.</p>
        <Link href="/v" className="mt-5 inline-block text-sol hover:underline">
          Verificar um documento
        </Link>
      </div>
    </main>
  );
}
