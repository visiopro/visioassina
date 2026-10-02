import { test } from "node:test";
import assert from "node:assert/strict";
import { documentoValido, faltamDoCliente, preencher, variaveisOrfas, type Campo } from "./contrato.ts";

const campos: Campo[] = [
  { chave: "empresa", rotulo: "Empresa", tipo: "texto", quem: "cliente", obrigatorio: true },
  { chave: "cnpj", rotulo: "CNPJ", tipo: "cnpj", quem: "cliente", obrigatorio: true },
  { chave: "valor", rotulo: "Valor", tipo: "moeda", quem: "voce", obrigatorio: true },
];

test("preenche variáveis e formata por tipo", () => {
  const t = preencher("A {{empresa}}, CNPJ {{cnpj}}, pagará {{valor}}.", campos, {
    empresa: "Usina Planalto LTDA",
    cnpj: "35969774000100",
    valor: "2000,00",
  });
  // o separador que o Intl usa entre "R$" e o número é espaço fixo
  assert.equal(t.replace(/\u00a0/g, " "), "A Usina Planalto LTDA, CNPJ 35.969.774/0001-00, pagará R$ 2.000,00.");
});

test("o que falta vira linha em branco", () => {
  assert.match(preencher("CNPJ {{cnpj}}", campos, {}), /__________/);
});

test("acusa variável sem campo cadastrado", () => {
  assert.deepEqual(variaveisOrfas("Olá {{empresa}} e {{endereco}}", campos), ["endereco"]);
});

test("lista o que o cliente ainda precisa preencher", () => {
  assert.deepEqual(faltamDoCliente(campos, { empresa: "X" }).map((c) => c.chave), ["cnpj"]);
});

test("valida CNPJ e CPF", () => {
  assert.ok(documentoValido("cnpj", "35.969.774/0001-00"));
  assert.ok(!documentoValido("cnpj", "11111111111111"));
  assert.ok(documentoValido("cpf", "529.982.247-25"));
  assert.ok(!documentoValido("cpf", "123.456.789-00"));
});
