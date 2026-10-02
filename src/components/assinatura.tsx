"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { TIPOS, formatarValor, preencher, type Campo } from "@/lib/contrato";
import { Aviso, Botao, Campo as CampoUI, Cartao, cx } from "./ui";

type Props = {
  token: string;
  titulo: string;
  marca: string;
  corpo: string;
  campos: Campo[];
  valores: Record<string, string>;
  destinatario: string;
  canal: "whatsapp" | "email";
  jaAssinado: boolean;
  codigoVerificacao: string;
};

/** Quadro de desenho da assinatura, com o dedo ou o mouse */
function Rabisco({ aoMudar }: { aoMudar: (dataUrl: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const [temTraco, setTemTraco] = useState(false);

  useEffect(() => {
    const canvas = ref.current!;
    const escala = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * escala;
    canvas.height = canvas.offsetHeight * escala;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(escala, escala);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0B1A30";
  }, []);

  const ponto = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <div>
      <canvas
        ref={ref}
        className="h-40 w-full touch-none rounded-[var(--radius-campo)] border border-traco bg-white"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const ctx = ref.current!.getContext("2d")!;
          const p = ponto(e);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          desenhando.current = true;
        }}
        onPointerMove={(e) => {
          if (!desenhando.current) return;
          const ctx = ref.current!.getContext("2d")!;
          const p = ponto(e);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          setTemTraco(true);
        }}
        onPointerUp={() => {
          desenhando.current = false;
          aoMudar(ref.current!.toDataURL("image/png"));
        }}
      />
      <div className="mt-2 flex items-center justify-between text-xs text-nevoa">
        <span>Assine com o dedo ou o mouse</span>
        <button
          type="button"
          onClick={() => {
            const canvas = ref.current!;
            canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
            setTemTraco(false);
            aoMudar(null);
          }}
          className={cx("hover:text-texto", temTraco ? "text-sol" : "text-nevoa")}
        >
          Apagar
        </button>
      </div>
    </div>
  );
}

export function Assinatura(p: Props) {
  const doCliente = p.campos.filter((c) => c.quem === "cliente");
  const [passo, setPasso] = useState<"dados" | "contrato" | "assinar" | "pronto">(p.jaAssinado ? "pronto" : "dados");
  const [valores, setValores] = useState<Record<string, string>>(p.valores ?? {});
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [nome, setNome] = useState(p.destinatario);
  const [documento, setDocumento] = useState("");
  const [aceite, setAceite] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function chamar(caminho: string, corpo: unknown) {
    setErro(null);
    setCarregando(true);
    try {
      const r = await fetch(`/api/c/${p.token}/${caminho}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.erro || "Não foi possível concluir.");
      return json as Record<string, string>;
    } catch (e) {
      setErro((e as Error).message);
      return null;
    } finally {
      setCarregando(false);
    }
  }

  if (passo === "pronto") {
    return (
      <Cartao className="p-6 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-economia/15 text-economia">
          <Check size={24} />
        </span>
        <p className="mt-4 text-xl font-semibold">Contrato assinado</p>
        <p className="mt-1 text-sm text-nevoa">Documento {p.codigoVerificacao}. Guarde o PDF: ele traz o comprovante da assinatura.</p>
        <a href={`/api/c/${p.token}/pdf`} target="_blank" className="mt-5 block rounded-[var(--radius-campo)] bg-sol px-4 py-3 font-semibold text-noite hover:bg-sol-forte">
          Baixar o contrato assinado
        </a>
      </Cartao>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-1.5">
        {["dados", "contrato", "assinar"].map((x) => (
          <span key={x} className={cx("h-1 flex-1 rounded-full", ["dados", "contrato", "assinar"].indexOf(passo) >= ["dados", "contrato", "assinar"].indexOf(x) ? "bg-sol" : "bg-traco")} />
        ))}
      </div>

      {passo === "dados" ? (
        <Cartao className="space-y-4 p-5">
          <p className="font-medium">Confirme seus dados</p>
          {doCliente.map((c) => (
            <CampoUI key={c.chave} rotulo={`${c.rotulo}${c.obrigatorio ? "" : " (opcional)"}`} ajuda={c.tipo !== "texto" ? TIPOS[c.tipo] : undefined}>
              <input
                value={valores[c.chave] ?? ""}
                onChange={(e) => setValores((v) => ({ ...v, [c.chave]: e.target.value }))}
                type={c.tipo === "data" ? "date" : c.tipo === "email" ? "email" : "text"}
                inputMode={["cnpj", "cpf", "telefone", "numero", "moeda"].includes(c.tipo) ? "numeric" : undefined}
                className="campo"
              />
            </CampoUI>
          ))}
          {!doCliente.length ? <p className="text-sm text-nevoa">Não há dados para completar. Pode seguir para a leitura.</p> : null}
          {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
          <Botao
            className="w-full"
            disabled={carregando}
            onClick={async () => {
              const r = await chamar("dados", { valores });
              if (r) setPasso("contrato");
            }}
          >
            {carregando ? <Loader2 size={17} className="animate-spin" /> : null} Continuar
          </Botao>
        </Cartao>
      ) : null}

      {passo === "contrato" ? (
        <Cartao className="p-5">
          <p className="mb-3 font-medium">Leia o contrato</p>
          <div className="max-h-[55vh] overflow-y-auto whitespace-pre-wrap rounded-[var(--radius-campo)] border border-traco bg-noite p-4 text-sm leading-relaxed">
            {preencher(p.corpo, p.campos, valores)}
          </div>
          <div className="mt-4 flex gap-2">
            <Botao variante="secundario" onClick={() => setPasso("dados")}>
              Voltar
            </Botao>
            <Botao className="flex-1" onClick={() => setPasso("assinar")}>
              Li e quero assinar
            </Botao>
          </div>
        </Cartao>
      ) : null}

      {passo === "assinar" ? (
        <Cartao className="space-y-4 p-5">
          <p className="font-medium">Assine</p>
          <Rabisco aoMudar={setAssinatura} />
          <CampoUI rotulo="Nome completo">
            <input value={nome} onChange={(e) => setNome(e.target.value)} className="campo" autoComplete="name" />
          </CampoUI>
          <CampoUI rotulo="CPF ou CNPJ do signatário" ajuda="Entra no comprovante da assinatura.">
            <input value={documento} onChange={(e) => setDocumento(e.target.value)} inputMode="numeric" className="campo" />
          </CampoUI>

          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-sol)]" />
            <span>
              Li o contrato, concordo com o conteúdo e aceito assinar eletronicamente. Entendo que ficam registrados data, hora, IP e o código de confirmação.
            </span>
          </label>

          {!enviadoPara ? (
            <Botao
              className="w-full"
              disabled={carregando || !assinatura || !aceite || nome.trim().length < 3}
              onClick={async () => {
                const r = await chamar("codigo", {});
                if (r) setEnviadoPara(String(r.destino ?? ""));
              }}
            >
              {carregando ? <Loader2 size={17} className="animate-spin" /> : null}
              Receber código por {p.canal === "whatsapp" ? "WhatsApp" : "e-mail"}
            </Botao>
          ) : (
            <>
              <CampoUI rotulo="Código recebido" ajuda={`Enviado para ${enviadoPara}. Vale por 15 minutos.`}>
                <input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  className="campo text-center text-xl tracking-[0.4em]"
                  placeholder="000000"
                />
              </CampoUI>
              <Botao
                className="w-full"
                disabled={carregando || codigo.length !== 6}
                onClick={async () => {
                  const r = await chamar("assinar", { codigo, nome, documento, assinatura, aceite });
                  if (r) setPasso("pronto");
                }}
              >
                {carregando ? <Loader2 size={17} className="animate-spin" /> : null} Assinar contrato
              </Botao>
              <button type="button" onClick={() => chamar("codigo", {})} className="w-full text-sm text-nevoa hover:text-texto">
                Enviar outro código
              </button>
            </>
          )}

          {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
          <p className="text-xs text-nevoa">
            Valores em reais e documentos aparecem formatados no contrato final. Ex.: {formatarValor("moeda", "2000,00")}.
          </p>
        </Cartao>
      ) : null}
    </div>
  );
}
