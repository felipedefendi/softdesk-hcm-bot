import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, CalendarPlus, Trash2 } from "lucide-react";
import { Cartao } from "../../components/Cartao";
import { DrawerLateral } from "../../components/DrawerLateral";
import { Esqueleto } from "../../components/Esqueleto";
import { ErroCarregamento } from "../../components/ErroCarregamento";
import { useAgenda } from "../../hooks/useAgenda";
import { useAtendentes } from "../../hooks/useAtendentes";
import { useAuth } from "../../auth/AuthContext";
import { ehMeuAtendente, souAdmin } from "../../lib/permissoes";
import { explicarDia, gradeDoMes } from "../../lib/gradeDoMes";
import { andarMes } from "../../lib/navegarMes";
import type { DiaEspecial } from "../../api/tipos";
import { GradeDoMes } from "./GradeDoMes";
import { FormularioDiaEspecial } from "./FormularioDiaEspecial";
import { FormularioFerias } from "./FormularioFerias";
import { FeriadosSugeridos } from "./FeriadosSugeridos";
import styles from "./Agenda.module.css";

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** Data local, nao UTC: `toISOString()` ja vira amanha as 21:00 no horario de Brasília. */
function hojeLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatarDataCurta(data: string): string {
  const [, mes, dia] = data.split("-");
  return `${dia}/${mes}`;
}

type Drawer =
  | { tipo: "fechado" }
  | { tipo: "dia"; data: string }
  | { tipo: "ferias"; data: string }
  | { tipo: "feriados" };

export function Agenda() {
  const { agenda, erro, recarregar, salvarDias, removerDia, salvarFerias, removerFerias, sugerirFeriados } = useAgenda();
  const { atendentes } = useAtendentes();
  const { eu } = useAuth();
  const admin = souAdmin(eu);

  // Pro select de ferias e pra saber de quem e cada linha da tabela abaixo -
  // o cadastro de ferias so guarda o nome, nao o codigo.
  const meuAtendente = atendentes?.find((a) => ehMeuAtendente(eu, a.codigoAtendente)) ?? null;
  const codigoPorNome = new Map((atendentes ?? []).map((a) => [a.nome, a.codigoAtendente]));

  const hoje = hojeLocal();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { ano: d.getFullYear(), mes: d.getMonth() + 1 };
  });
  const [drawer, setDrawer] = useState<Drawer>({ tipo: "fechado" });

  const semanas = useMemo(
    () => gradeDoMes(cursor.ano, cursor.mes, agenda?.diasEspeciais ?? [], agenda?.ferias ?? []),
    [cursor, agenda]
  );

  // Ferias que ainda nao terminaram, pra responder "quem sai quando" sem
  // precisar navegar mes a mes.
  const proximasFerias = useMemo(
    () => (agenda?.ferias ?? []).filter((f) => f.fim >= hoje).sort((a, b) => a.inicio.localeCompare(b.inicio)),
    [agenda, hoje]
  );

  function irParaMes(passo: number) {
    setCursor((atual) => andarMes(atual, passo));
  }

  const diaAberto = drawer.tipo === "dia" ? drawer.data : null;
  const especialDoDia = diaAberto ? agenda?.diasEspeciais.find((d) => d.data === diaAberto) ?? null : null;
  const feriasDoDiaAberto = diaAberto
    ? (agenda?.ferias ?? []).filter((f) => f.inicio <= diaAberto && diaAberto <= f.fim)
    : [];

  async function aoSalvarDia(dia: DiaEspecial) {
    await salvarDias(dia);
    setDrawer({ tipo: "fechado" });
  }

  async function aoRemoverDia() {
    if (!diaAberto) return;
    await removerDia(diaAberto);
    setDrawer({ tipo: "fechado" });
  }

  return (
    <div className={styles.pagina}>
      <Cartao>
        <div className={styles.cabecalho}>
          <div className={styles.navegacao}>
            <button
              type="button"
              className={styles.botaoMes}
              onClick={() => irParaMes(-1)}
              aria-label="Mês anterior"
            >
              <ChevronLeft size={18} strokeWidth={1.5} />
            </button>
            <h2 className={styles.titulo}>
              {MESES[cursor.mes - 1]} de {cursor.ano}
            </h2>
            <button type="button" className={styles.botaoMes} onClick={() => irParaMes(1)} aria-label="Próximo mês">
              <ChevronRight size={18} strokeWidth={1.5} />
            </button>
          </div>

          <div className={styles.acoes}>
            <button type="button" onClick={() => setDrawer({ tipo: "ferias", data: hoje })}>
              <Plus size={16} strokeWidth={2} /> Férias
            </button>
            {admin && (
              <button type="button" className="botao-secundario" onClick={() => setDrawer({ tipo: "feriados" })}>
                <CalendarPlus size={16} strokeWidth={1.5} /> Feriados de {cursor.ano}
              </button>
            )}
          </div>
        </div>

        {agenda === null && erro && <ErroCarregamento mensagem={erro} onTentarNovamente={recarregar} />}
        {agenda === null && !erro && <Esqueleto linhas={5} />}
        {agenda !== null && (
          <>
            {/* Qualquer pessoa abre o dia pra entender o que acontece nele; so
                admin ve o formulario de edicao dentro do drawer. */}
            <GradeDoMes semanas={semanas} hoje={hoje} onAbrirDia={(data) => setDrawer({ tipo: "dia", data })} />
            <p className={styles.dica}>
              {admin
                ? "Clique num dia para ver o que acontece nele, bloqueá-lo ou definir um horário diferente."
                : "Clique num dia para ver o que acontece nele."}
            </p>
          </>
        )}
      </Cartao>

      <Cartao>
        <h2 className={styles.titulo}>Próximas férias</h2>

        {agenda !== null && proximasFerias.length === 0 && (
          <p className={styles.vazio}>Ninguém com férias agendadas daqui pra frente.</p>
        )}

        {proximasFerias.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Atendente</th>
                <th>Período</th>
                <th>Observação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {proximasFerias.map((f) => {
                const podeRemover = admin || ehMeuAtendente(eu, codigoPorNome.get(f.atendente) ?? null);
                return (
                  <tr key={f.id}>
                    <td data-rotulo="Atendente">{f.atendente}</td>
                    <td data-rotulo="Período" className="tabular">
                      {formatarDataCurta(f.inicio)} a {formatarDataCurta(f.fim)}
                      {f.inicio <= hoje && <span className={styles.badgeAgora}>em férias</span>}
                    </td>
                    <td data-rotulo="Observação">{f.observacao || "—"}</td>
                    <td data-rotulo="Ações">
                      {podeRemover && (
                        <button
                          type="button"
                          className={styles.botaoIcone}
                          aria-label={`Remover férias de ${f.atendente}`}
                          title="Remover"
                          onClick={() => {
                            if (window.confirm(`Remover as férias de ${f.atendente}?`)) removerFerias(f.id);
                          }}
                        >
                          <Trash2 size={14} strokeWidth={1.5} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Cartao>

      <DrawerLateral
        aberto={drawer.tipo !== "fechado"}
        titulo={
          drawer.tipo === "dia"
            ? `Dia ${formatarDataCurta(drawer.data)}`
            : drawer.tipo === "ferias"
              ? "Agendar férias"
              : "Feriados nacionais"
        }
        onFechar={() => setDrawer({ tipo: "fechado" })}
      >
        {drawer.tipo === "dia" && (
          <>
            <div className={styles.resumoDoDia}>
              {especialDoDia ? (
                <p className={especialDoDia.tipo === "bloqueado" ? styles.explicacaoBloqueio : styles.explicacaoJanela}>
                  {explicarDia(especialDoDia)}
                </p>
              ) : (
                <p className={styles.explicacaoNormal}>
                  Dia normal — o revezamento funciona no horário de sempre.
                </p>
              )}

              {feriasDoDiaAberto.length > 0 && (
                <p className={styles.explicacaoFerias}>
                  De férias: {feriasDoDiaAberto.map((f) => f.atendente).join(", ")}.
                </p>
              )}
            </div>

            {admin ? (
              <FormularioDiaEspecial
                data={drawer.data}
                existente={especialDoDia}
                atendentes={atendentes ?? []}
                onSalvar={aoSalvarDia}
                onRemover={aoRemoverDia}
                onCancelar={() => setDrawer({ tipo: "fechado" })}
              />
            ) : (
              <button type="button" className="botao-secundario" onClick={() => setDrawer({ tipo: "fechado" })}>
                Fechar
              </button>
            )}
          </>
        )}

        {drawer.tipo === "ferias" && (
          <FormularioFerias
            // Quem nao e admin so agenda a propria ferias (ver PLANO-USUARIOS.md) -
            // restringir a lista aqui trava o select nisso, sem duplicar a regra.
            atendentes={admin ? atendentes ?? [] : meuAtendente ? [meuAtendente] : []}
            dataInicial={drawer.data}
            onSalvar={async (nova) => {
              const aviso = await salvarFerias(nova);
              setDrawer({ tipo: "fechado" });
              return aviso;
            }}
            onCancelar={() => setDrawer({ tipo: "fechado" })}
          />
        )}

        {drawer.tipo === "feriados" && (
          <FeriadosSugeridos
            ano={cursor.ano}
            carregar={sugerirFeriados}
            onAdicionar={async (dias) => {
              await salvarDias(dias);
              setDrawer({ tipo: "fechado" });
            }}
            onCancelar={() => setDrawer({ tipo: "fechado" })}
          />
        )}
      </DrawerLateral>
    </div>
  );
}
