import { test } from "node:test";
import assert from "node:assert/strict";
import {
  diasSemAtendenteDisponivel,
  estadoDoDia,
  estaDeFerias,
  motivoDoBloqueio,
  validarDiaEspecial,
  validarFerias,
} from "./regras";
import type { DiaEspecial, Ferias } from "./tipos";

// Referencia: 20/07/2026 e uma segunda-feira; 25 e 26/07 sao sabado e domingo.

const NATAL: DiaEspecial = { data: "2026-12-25", tipo: "bloqueado", motivo: "Natal" };
const VESPERA: DiaEspecial = { data: "2026-12-24", tipo: "janela", inicio: "08:00", fim: "12:00", motivo: "Véspera de Natal" };

function ferias(atendente: string, inicio: string, fim: string, id = `${atendente}-${inicio}`): Ferias {
  return { id, atendente, inicio, fim };
}

test("dia sem cadastro libera o revezamento em qualquer hora", () => {
  assert.deepEqual(estadoDoDia({ ano: 2026, mes: 12, dia: 23 }, "09:00", [NATAL, VESPERA]), { rodizio: "liberado" });
});

test("dia bloqueado nao encaminha em hora nenhuma", () => {
  for (const hora of ["07:00", "12:00", "18:55"]) {
    assert.deepEqual(estadoDoDia({ ano: 2026, mes: 12, dia: 25 }, hora, [NATAL, VESPERA]), {
      rodizio: "bloqueado",
      motivo: "Natal",
    });
  }
});

test("dentro da janela libera, fora nao", () => {
  const vespera = { ano: 2026, mes: 12, dia: 24 };

  assert.equal(estadoDoDia(vespera, "07:55", [VESPERA]).rodizio, "fora-da-janela"); // antes de abrir
  assert.equal(estadoDoDia(vespera, "09:30", [VESPERA]).rodizio, "liberado");
  assert.equal(estadoDoDia(vespera, "14:00", [VESPERA]).rodizio, "fora-da-janela"); // depois de fechar
});

test("a borda: inicio inclusivo, fim exclusivo", () => {
  // O que o Felipe pediu com "so trabalha ate 12:00": a passada das 12:00 em
  // ponto ja nao encaminha. Sem isso, o ultimo chamado do dia cairia pra
  // alguem que ja foi embora.
  const vespera = { ano: 2026, mes: 12, dia: 24 };

  assert.equal(estadoDoDia(vespera, "08:00", [VESPERA]).rodizio, "liberado");
  assert.equal(estadoDoDia(vespera, "11:55", [VESPERA]).rodizio, "liberado");
  assert.equal(estadoDoDia(vespera, "12:00", [VESPERA]).rodizio, "fora-da-janela");
});

test("fora-da-janela devolve o horario, pra tela poder explicar", () => {
  assert.deepEqual(estadoDoDia({ ano: 2026, mes: 12, dia: 24 }, "16:00", [VESPERA]), {
    rodizio: "fora-da-janela",
    inicio: "08:00",
    fim: "12:00",
    motivo: "Véspera de Natal",
  });
});

test("motivoDoBloqueio so acusa dia inteiro, nunca janela reduzida", () => {
  // A distincao que protege o relatorio: no dia de janela reduzida o diario
  // das 17:45 continua saindo, porque os numeros do dia valem do mesmo jeito.
  assert.equal(motivoDoBloqueio({ ano: 2026, mes: 12, dia: 25 }, [NATAL, VESPERA]), "Natal");
  assert.equal(motivoDoBloqueio({ ano: 2026, mes: 12, dia: 24 }, [NATAL, VESPERA]), null);
  assert.equal(motivoDoBloqueio({ ano: 2026, mes: 12, dia: 23 }, [NATAL, VESPERA]), null);
});

test("estaDeFerias inclui o primeiro e o ultimo dia", () => {
  const lista = [ferias("Ana", "2026-09-10", "2026-09-20")];

  assert.equal(estaDeFerias("Ana", { ano: 2026, mes: 9, dia: 9 }, lista), false);
  assert.equal(estaDeFerias("Ana", { ano: 2026, mes: 9, dia: 10 }, lista), true);
  assert.equal(estaDeFerias("Ana", { ano: 2026, mes: 9, dia: 20 }, lista), true);
  assert.equal(estaDeFerias("Ana", { ano: 2026, mes: 9, dia: 21 }, lista), false);
});

test("ferias de um nao afeta o outro", () => {
  const lista = [ferias("Ana", "2026-09-10", "2026-09-20")];
  assert.equal(estaDeFerias("Bruno", { ano: 2026, mes: 9, dia: 15 }, lista), false);
});

test("diasSemAtendenteDisponivel acha o buraco", () => {
  // Ana some a semana toda, Bruno so na quarta: 16/09 fica sem ninguem.
  const lista = [ferias("Ana", "2026-09-14", "2026-09-18"), ferias("Bruno", "2026-09-16", "2026-09-16")];

  assert.deepEqual(diasSemAtendenteDisponivel({ inicio: "2026-09-14", fim: "2026-09-18" }, ["Ana", "Bruno"], lista, []), [
    "2026-09-16",
  ]);
});

test("diasSemAtendenteDisponivel ignora fim de semana e dia bloqueado", () => {
  // Equipe inteira fora de 18 a 21/09/2026 (sexta a segunda). Sabado e domingo
  // nao contam porque o bot nao roda; a sexta e feriado, mesma coisa. Sobra a
  // segunda 21/09 como o unico aviso que interessa.
  const todos = [ferias("Ana", "2026-09-18", "2026-09-21"), ferias("Bruno", "2026-09-18", "2026-09-21")];
  const feriado: DiaEspecial = { data: "2026-09-18", tipo: "bloqueado", motivo: "Feriado municipal" };

  assert.deepEqual(
    diasSemAtendenteDisponivel({ inicio: "2026-09-18", fim: "2026-09-21" }, ["Ana", "Bruno"], todos, [feriado]),
    ["2026-09-21"]
  );
});

test("diasSemAtendenteDisponivel nao acusa nada quando alguem fica", () => {
  const lista = [ferias("Ana", "2026-09-14", "2026-09-18")];
  assert.deepEqual(diasSemAtendenteDisponivel({ inicio: "2026-09-14", fim: "2026-09-18" }, ["Ana", "Bruno"], lista, []), []);
});

test("validarFerias recusa data invertida, atendente desconhecido e data que nao existe", () => {
  const nomes = ["Ana", "Bruno"];

  assert.match(validarFerias(ferias("Ana", "2026-09-20", "2026-09-10"), [], nomes) ?? "", /inicio nao pode ser depois/);
  assert.match(validarFerias(ferias("Carla", "2026-09-10", "2026-09-20"), [], nomes) ?? "", /nao esta cadastrado/);
  assert.match(validarFerias(ferias("Ana", "2026-02-31", "2026-03-05"), [], nomes) ?? "", /formato AAAA-MM-DD/);
});

test("validarFerias recusa sobreposicao do mesmo atendente", () => {
  const existentes = [ferias("Ana", "2026-09-10", "2026-09-20")];
  const nomes = ["Ana", "Bruno"];

  // Encosta pelo fim, encosta pelo comeco e engole o intervalo inteiro.
  assert.ok(validarFerias(ferias("Ana", "2026-09-18", "2026-09-25", "nova"), existentes, nomes));
  assert.ok(validarFerias(ferias("Ana", "2026-09-05", "2026-09-12", "nova"), existentes, nomes));
  assert.ok(validarFerias(ferias("Ana", "2026-09-01", "2026-09-30", "nova"), existentes, nomes));

  // Bruno no mesmo periodo pode, e um dia depois do fim da Ana tambem.
  assert.equal(validarFerias(ferias("Bruno", "2026-09-10", "2026-09-20", "nova"), existentes, nomes), null);
  assert.equal(validarFerias(ferias("Ana", "2026-09-21", "2026-09-30", "nova"), existentes, nomes), null);
});

test("validarFerias deixa editar a propria ferias sem colidir consigo mesma", () => {
  const existentes = [ferias("Ana", "2026-09-10", "2026-09-20", "abc")];
  const esticada = { id: "abc", atendente: "Ana", inicio: "2026-09-10", fim: "2026-09-25" };

  assert.equal(validarFerias(esticada, existentes, ["Ana"]), null);
});

test("validarDiaEspecial cobre horario e motivo", () => {
  const base = { data: "2026-12-24", motivo: "Véspera de Natal" } as const;

  assert.equal(validarDiaEspecial({ ...base, tipo: "janela", inicio: "08:00", fim: "12:00" }), null);
  assert.equal(validarDiaEspecial({ data: "2026-12-25", tipo: "bloqueado", motivo: "Natal" }), null);

  assert.match(validarDiaEspecial({ ...base, tipo: "janela", inicio: "12:00", fim: "08:00" }) ?? "", /antes do de fim/);
  assert.match(validarDiaEspecial({ ...base, tipo: "janela", inicio: "12:00", fim: "12:00" }) ?? "", /antes do de fim/);
  assert.match(validarDiaEspecial({ ...base, tipo: "janela", inicio: "8:00", fim: "12:00" }) ?? "", /HH:MM/);
  assert.match(validarDiaEspecial({ ...base, tipo: "janela", inicio: "08:00", fim: "25:00" }) ?? "", /HH:MM/);
  assert.match(validarDiaEspecial({ data: "2026-12-25", tipo: "bloqueado", motivo: "  " }) ?? "", /motivo/);
});
