"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

const itens = [
  { href: "/", rotulo: "Contratos" },
  { href: "/modelos", rotulo: "Modelos" },
];

export function Navegacao() {
  const atual = usePathname();
  return (
    <nav className="flex gap-1">
      {itens.map((i) => {
        const ativo = i.href === "/" ? atual === "/" || atual.startsWith("/contratos") : atual.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={ativo ? "page" : undefined}
            className={cx("rounded-[var(--radius-campo)] px-3 py-1.5 text-sm", ativo ? "bg-relevo text-texto" : "text-nevoa hover:text-texto")}
          >
            {i.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
