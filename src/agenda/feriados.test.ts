import { test } from "node:test";
import assert from "node:assert/strict";
import { domingoDePascoa, feriadosDoAno } from "./feriados";

test("domingoDePascoa bate com anos conhecidos", () => {
  // Quatro anos de referencia, incluindo um bissexto (2024) e a virada de
  // marco pra abril, que e onde o algoritmo costuma errar quando mal copiado.
  assert.deepEqual(domingoDePascoa(2024), { ano: 2024, mes: 3, dia: 31 });
  assert.deepEqual(domingoDePascoa(2025), { ano: 2025, mes: 4, dia: 20 });
  assert.deepEqual(domingoDePascoa(2026), { ano: 2026, mes: 4, dia: 5 });
  assert.deepEqual(domingoDePascoa(2027), { ano: 2027, mes: 3, dia: 28 });
});

test("domingoDePascoa cai sempre num domingo", () => {
  // Vale mais que qualquer data isolada: se a conta escorregar um dia em algum
  // ano, o dia da semana denuncia na hora.
  for (let ano = 2020; ano <= 2060; ano++) {
    const p = domingoDePascoa(ano);
    const semana = new Date(Date.UTC(p.ano, p.mes - 1, p.dia)).getUTCDay();
    assert.equal(semana, 0, `Pascoa de ${ano} caiu no dia da semana ${semana}`);
  }
});

test("os moveis de 2026 saem certos a partir da Pascoa", () => {
  // Pascoa 05/04/2026: Carnaval 17/02, Sexta-feira Santa 03/04, Corpus 04/06.
  const porMotivo = new Map(feriadosDoAno(2026).map((f) => [f.dia.motivo, f.dia]));

  assert.equal(porMotivo.get("Carnaval")?.data, "2026-02-17");
  assert.equal(porMotivo.get("Segunda-feira de Carnaval")?.data, "2026-02-16");
  assert.equal(porMotivo.get("Quarta-feira de Cinzas")?.data, "2026-02-18");
  assert.equal(porMotivo.get("Sexta-feira Santa")?.data, "2026-04-03");
  assert.equal(porMotivo.get("Corpus Christi")?.data, "2026-06-04");
});

test("Quarta-feira de Cinzas vem como janela, nao como bloqueio", () => {
  const cinzas = feriadosDoAno(2026).find((f) => f.dia.motivo === "Quarta-feira de Cinzas")?.dia;

  assert.equal(cinzas?.tipo, "janela");
  assert.equal(cinzas?.tipo === "janela" && cinzas.inicio, "12:00");

  // O fim precisa passar de 18:55, ultimo disparo do softdesk-bot.timer, senao
  // a sugestao encurta a tarde em vez de so liberar a manha.
  assert.ok(cinzas?.tipo === "janela" && cinzas.fim > "18:55", `fim ficou em ${cinzas?.tipo === "janela" && cinzas.fim}`);
});

test("o que varia de empresa pra empresa chega desmarcado", () => {
  const marcado = new Map(feriadosDoAno(2026).map((f) => [f.dia.motivo, f.marcadoPorPadrao]));

  assert.equal(marcado.get("Natal"), true);
  assert.equal(marcado.get("Carnaval"), true);
  assert.equal(marcado.get("Sexta-feira Santa"), true);

  assert.equal(marcado.get("Segunda-feira de Carnaval"), false);
  assert.equal(marcado.get("Quarta-feira de Cinzas"), false);
  assert.equal(marcado.get("Corpus Christi"), false);
});

test("feriado em fim de semana nao e sugerido", () => {
  // 15/11/2026 cai num domingo - bloquear domingo nao desliga nada, porque o
  // timer do bot so roda de segunda a sexta.
  const datas2026 = feriadosDoAno(2026).map((f) => f.dia.data);
  assert.ok(!datas2026.includes("2026-11-15"));
  assert.ok(datas2026.includes("2026-11-20")); // sexta, esse entra

  // 25/12/2027 cai num sabado.
  assert.ok(!feriadosDoAno(2027).map((f) => f.dia.data).includes("2027-12-25"));
});

test("nenhum feriado sugerido cai em fim de semana, em nenhum ano", () => {
  for (let ano = 2026; ano <= 2040; ano++) {
    for (const { dia } of feriadosDoAno(ano)) {
      const [a, m, d] = dia.data.split("-").map(Number);
      const semana = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
      assert.ok(semana >= 1 && semana <= 5, `${dia.data} (${dia.motivo}) caiu em fim de semana`);
    }
  }
});

test("a lista sai ordenada por data e sem repetir dia", () => {
  const datas = feriadosDoAno(2026).map((f) => f.dia.data);

  assert.deepEqual(datas, [...datas].sort());
  assert.equal(new Set(datas).size, datas.length, `datas repetidas em 2026: ${datas}`);
});
