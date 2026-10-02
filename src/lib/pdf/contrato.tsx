import { Document, Font, Image, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { Campo } from "../contrato";
import { preencher } from "../contrato";

Font.registerHyphenationCallback((p) => [p]);

const NAVY = "#0B1A30";
const OURO = "#C9962E";
const TINTA = "#1B2638";
const CINZA = "#6B7890";
const LINHA = "#E3E7EE";

const s = StyleSheet.create({
  pagina: { fontFamily: "Helvetica", fontSize: 10, color: TINTA, lineHeight: 1.5, paddingHorizontal: 50, paddingTop: 44, paddingBottom: 60 },
  topo: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 2, borderBottomColor: OURO, paddingBottom: 8, marginBottom: 20 },
  marca: { fontSize: 14, fontFamily: "Helvetica-Bold", color: NAVY },
  titulo: { fontSize: 16, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 14 },
  par: { marginBottom: 8, textAlign: "justify" },
  h: { fontSize: 11, fontFamily: "Helvetica-Bold", color: NAVY, marginTop: 12, marginBottom: 5 },
  rodape: { position: "absolute", bottom: 28, left: 50, right: 50, borderTopWidth: 1, borderTopColor: LINHA, paddingTop: 6, fontSize: 7.5, color: CINZA, flexDirection: "row", justifyContent: "space-between" },
  assBloco: { marginTop: 26, flexDirection: "row", justifyContent: "space-between" },
  assCaixa: { width: "47%" },
  assLinha: { borderTopWidth: 1, borderTopColor: TINTA, marginTop: 44, paddingTop: 5, fontSize: 9 },
  comprovanteTit: { fontSize: 13, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 10 },
  linha: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: LINHA, paddingVertical: 5, fontSize: 9 },
  selo: { marginTop: 16, borderWidth: 1, borderColor: OURO, borderRadius: 6, padding: 12, fontSize: 9, color: CINZA },
});

export type DadosContrato = {
  titulo: string;
  marca: string;
  corpo: string;
  campos: Campo[];
  valores: Record<string, string>;
  codigo_verificacao: string;
  assinatura_imagem: string | null;
  assinatura_nome: string | null;
  destinatario_nome: string;
  assinante_documento: string | null;
  assinante_ip: string | null;
  assinante_agente: string | null;
  codigo_enviado_para: string | null;
  confirmacao: "whatsapp" | "email";
  assinado_em: string | null;
  enviado_em: string | null;
  visualizado_em: string | null;
  urlVerificacao: string;
};

const quando = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "medium" }) : "—";

function Corpo({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(/\n{2,}/).map((bloco, i) => {
        const linha = bloco.trim();
        if (!linha) return null;
        const titulo = /^#{1,3}\s+/.test(linha);
        return (
          <Text key={i} style={titulo ? s.h : s.par}>
            {linha.replace(/^#{1,3}\s+/, "")}
          </Text>
        );
      })}
    </>
  );
}

function Doc({ c }: { c: DadosContrato }) {
  const texto = preencher(c.corpo, c.campos, c.valores);
  return (
    <Document title={c.titulo} author={c.marca}>
      <Page size="A4" style={s.pagina}>
        <View style={s.topo} fixed>
          <Text style={s.marca}>{c.marca}</Text>
          <Text style={{ fontSize: 8, color: CINZA }}>Documento {c.codigo_verificacao}</Text>
        </View>

        <Text style={s.titulo}>{c.titulo}</Text>
        <Corpo texto={texto} />

        <View style={s.assBloco} wrap={false}>
          <View style={s.assCaixa}>
            {c.assinatura_imagem ? <Image src={c.assinatura_imagem} style={{ height: 44, objectFit: "contain" }} /> : <View style={{ height: 44 }} />}
            <Text style={s.assLinha}>
              {c.assinatura_nome || c.destinatario_nome}
              {c.assinante_documento ? `\n${c.assinante_documento}` : ""}
            </Text>
          </View>
          <View style={s.assCaixa}>
            <View style={{ height: 44 }} />
            <Text style={s.assLinha}>{c.marca}</Text>
          </View>
        </View>

        <View style={s.rodape} fixed>
          <Text>
            {c.titulo} · {c.marca}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
        </View>
      </Page>

      <Page size="A4" style={s.pagina}>
        <View style={s.topo} fixed>
          <Text style={s.marca}>{c.marca}</Text>
          <Text style={{ fontSize: 8, color: CINZA }}>Documento {c.codigo_verificacao}</Text>
        </View>

        <Text style={s.comprovanteTit}>Comprovante de assinatura eletrônica</Text>
        <Text style={{ fontSize: 9, color: CINZA, marginBottom: 12 }}>
          Registro dos atos praticados neste documento, nos termos da Medida Provisória 2.200-2/2001, art. 10, § 2º.
        </Text>

        {[
          ["Signatário", c.assinatura_nome || c.destinatario_nome],
          ["Documento do signatário", c.assinante_documento || "não informado"],
          ["Confirmação por", `${c.confirmacao === "whatsapp" ? "código no WhatsApp" : "código no e-mail"} ${c.codigo_enviado_para ?? ""}`],
          ["Contrato enviado em", quando(c.enviado_em)],
          ["Aberto pelo signatário em", quando(c.visualizado_em)],
          ["Assinado em", quando(c.assinado_em)],
          ["Endereço IP", c.assinante_ip || "não registrado"],
          ["Navegador e aparelho", (c.assinante_agente || "não registrado").slice(0, 90)],
          ["Código de verificação", c.codigo_verificacao],
        ].map(([k, v]) => (
          <View key={k} style={s.linha}>
            <Text style={{ color: CINZA, width: "40%" }}>{k}</Text>
            <Text style={{ width: "58%", textAlign: "right" }}>{v}</Text>
          </View>
        ))}

        <View style={s.selo}>
          <Text>
            Para conferir a autenticidade deste documento, acesse {c.urlVerificacao} e informe o código {c.codigo_verificacao}. A página mostra a data da
            assinatura e a impressão digital (hash) do arquivo, que muda se o PDF for alterado.
          </Text>
        </View>

        <View style={s.rodape} fixed>
          <Text>Comprovante de assinatura · {c.marca}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export const gerarPdfContrato = (c: DadosContrato) => renderToBuffer(<Doc c={c} />);
