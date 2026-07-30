import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deISO,
  diaDaSemana,
  diaEmSaoPaulo,
  diasUteisAnteriores,
  ehDiaUtil,
  ehPrimeiroDiaUtilDoMes,
  formatarBR,
  formatarISO,
  horaEmSaoPaulo,
  mesAnteriorFechado,
  semanaSegASexta,
  somarDias,
} from "./periodos";

// Referencia: 20/07/2026 e uma segunda-feira (confirmado com dado real do
// SoftDesk - 18 e 19/07 foram fim de semana e nao produziram chamado).

test("diaEmSaoPaulo usa o fuso de Sao Paulo, nao o do sistema", () => {
  // 23/07 02:00 UTC ainda e dia 22 as 23:00 em Sao Paulo (UTC-3).
  const momento = new Date("2026-07-23T02:00:00Z");
  assert.deepEqual(diaEmSaoPaulo(momento), { ano: 2026, mes: 7, dia: 22 });
  assert.equal(horaEmSaoPaulo(momento), "23:00");
});

test("somarDias atravessa mes e ano", () => {
  assert.deepEqual(somarDias({ ano: 2026, mes: 12, dia: 31 }, 1), { ano: 2027, mes: 1, dia: 1 });
  assert.deepEqual(somarDias({ ano: 2026, mes: 3, dia: 1 }, -1), { ano: 2026, mes: 2, dia: 28 });
});

test("diaDaSemana e ehDiaUtil", () => {
  assert.equal(diaDaSemana({ ano: 2026, mes: 7, dia: 20 }), 1); // segunda
  assert.equal(diaDaSemana({ ano: 2026, mes: 7, dia: 26 }), 0); // domingo
  assert.equal(ehDiaUtil({ ano: 2026, mes: 7, dia: 20 }), true);
  assert.equal(ehDiaUtil({ ano: 2026, mes: 7, dia: 25 }), false); // sabado
});

test("diasUteisAnteriores pula o fim de semana", () => {
  // A partir de segunda 20/07, os tres anteriores sao 17, 16 e 15 (sex, qui, qua).
  assert.deepEqual(diasUteisAnteriores({ ano: 2026, mes: 7, dia: 20 }, 3), [
    { ano: 2026, mes: 7, dia: 17 },
    { ano: 2026, mes: 7, dia: 16 },
    { ano: 2026, mes: 7, dia: 15 },
  ]);
});

test("diasUteisAnteriores nao inclui o proprio dia", () => {
  const dias = diasUteisAnteriores({ ano: 2026, mes: 7, dia: 22 }, 1);
  assert.deepEqual(dias, [{ ano: 2026, mes: 7, dia: 21 }]);
});

test("semanaSegASexta a partir de qualquer dia da semana", () => {
  const esperado = {
    inicio: { ano: 2026, mes: 7, dia: 20 },
    fim: { ano: 2026, mes: 7, dia: 24 },
  };

  assert.deepEqual(semanaSegASexta({ ano: 2026, mes: 7, dia: 20 }), esperado); // segunda
  assert.deepEqual(semanaSegASexta({ ano: 2026, mes: 7, dia: 24 }), esperado); // sexta
  assert.deepEqual(semanaSegASexta({ ano: 2026, mes: 7, dia: 25 }), esperado); // sabado
  assert.deepEqual(semanaSegASexta({ ano: 2026, mes: 7, dia: 26 }), esperado); // domingo
});

test("mesAnteriorFechado vira o ano em janeiro", () => {
  assert.deepEqual(mesAnteriorFechado({ ano: 2026, mes: 1, dia: 15 }), {
    inicio: { ano: 2025, mes: 12, dia: 1 },
    fim: { ano: 2025, mes: 12, dia: 31 },
  });
});

test("mesAnteriorFechado acerta o ultimo dia de fevereiro", () => {
  assert.deepEqual(mesAnteriorFechado({ ano: 2026, mes: 3, dia: 10 }), {
    inicio: { ano: 2026, mes: 2, dia: 1 },
    fim: { ano: 2026, mes: 2, dia: 28 },
  });
});

test("ehPrimeiroDiaUtilDoMes quando o dia 1 e dia util", () => {
  // 01/09/2026 e terca: o proprio dia 1 vale, e o dia 2 nao.
  assert.equal(ehPrimeiroDiaUtilDoMes({ ano: 2026, mes: 9, dia: 1 }), true);
  assert.equal(ehPrimeiroDiaUtilDoMes({ ano: 2026, mes: 9, dia: 2 }), false);
});

test("ehPrimeiroDiaUtilDoMes adia quando o dia 1 cai no fim de semana", () => {
  // 01/08/2026 e sabado - o caso que fazia o mensal se perder. O primeiro dia
  // util e segunda 03/08.
  assert.equal(ehPrimeiroDiaUtilDoMes({ ano: 2026, mes: 8, dia: 1 }), false);
  assert.equal(ehPrimeiroDiaUtilDoMes({ ano: 2026, mes: 8, dia: 2 }), false); // domingo
  assert.equal(ehPrimeiroDiaUtilDoMes({ ano: 2026, mes: 8, dia: 3 }), true);
  assert.equal(ehPrimeiroDiaUtilDoMes({ ano: 2026, mes: 8, dia: 4 }), false);

  // 01/11/2026 e domingo: o primeiro dia util e segunda 02/11.
  assert.equal(ehPrimeiroDiaUtilDoMes({ ano: 2026, mes: 11, dia: 1 }), false);
  assert.equal(ehPrimeiroDiaUtilDoMes({ ano: 2026, mes: 11, dia: 2 }), true);
});

test("ehPrimeiroDiaUtilDoMes marca exatamente um dia em cada mes", () => {
  // A garantia que importa: o mensal nunca se perde nem sai duas vezes.
  for (let mes = 1; mes <= 12; mes++) {
    const marcados = [];
    for (let dia = 1; dia <= 28; dia++) {
      if (ehPrimeiroDiaUtilDoMes({ ano: 2027, mes, dia })) marcados.push(dia);
    }
    assert.equal(marcados.length, 1, `2027-${mes} marcou ${marcados.length} dias: ${marcados}`);
    assert.ok(marcados[0] <= 3, `2027-${mes} marcou o dia ${marcados[0]}, tarde demais`);
  }
});

test("o mes reportado nao muda quando o mensal e adiado", () => {
  // Adiar de sabado 01/08 pra segunda 03/08 tem que reportar julho igual.
  assert.deepEqual(
    mesAnteriorFechado({ ano: 2026, mes: 8, dia: 3 }),
    mesAnteriorFechado({ ano: 2026, mes: 8, dia: 1 })
  );
});

test("formatacao das datas", () => {
  const dia = { ano: 2026, mes: 7, dia: 5 };
  assert.equal(formatarBR(dia), "05/07/2026");
  assert.equal(formatarISO(dia), "2026-07-05");
  assert.deepEqual(deISO("2026-07-05"), dia);
});
