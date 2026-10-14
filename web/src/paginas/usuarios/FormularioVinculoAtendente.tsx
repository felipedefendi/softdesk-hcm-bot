import { useMemo, useState, type FormEvent } from "react";
import type { Atendente, VinculoAtendenteEntrada } from "../../api/tipos";
import { CampoEmailTeams } from "./CampoEmailTeams";
import styles from "./Formularios.module.css";

interface Props {
  nomeUsuario: string;
  codigoAtual: number | null;
  atendentes: Atendente[];
  onSalvar: (entrada: VinculoAtendenteEntrada) => Promise<void>;
  onCancelar: () => void;
}

function valorRestaurar(codigo: number): string {
  return `restaurar:${codigo}`;
}

export function FormularioVinculoAtendente({ nomeUsuario, codigoAtual, atendentes, onSalvar, onCancelar }: Props) {
  const atendenteAtual = atendentes.find((a) => a.codigoAtendente === codigoAtual);
  const removido = codigoAtual !== null && !atendenteAtual;
  const [valor, setValor] = useState(
    removido ? valorRestaurar(codigoAtual) : codigoAtual === null ? "" : String(codigoAtual)
  );
  const [emailTeams, setEmailTeams] = useState(atendenteAtual?.emailTeams ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const selecionado = useMemo(
    () => atendentes.find((a) => String(a.codigoAtendente) === valor),
    [atendentes, valor]
  );

  function escolher(novoValor: string) {
    setValor(novoValor);
    // Traz o e-mail do Teams que o atendente escolhido ja tem, pra conferir.
    const atendente = atendentes.find((a) => String(a.codigoAtendente) === novoValor);
    if (atendente?.emailTeams) setEmailTeams(atendente.emailTeams);
  }

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const restaurando = valor.startsWith("restaurar:");
      const codigo = valor ? Number(restaurando ? valor.slice("restaurar:".length) : valor) : null;
      await onSalvar({
        codigoAtendente: codigo,
        garantirNoRodizio: restaurando || selecionado?.ativo === false,
        emailTeams,
      });
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
      setEnviando(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={enviar}>
      <p className={styles.explicacao}>
        O vínculo define qual atendente esta conta pode gerenciar. Se ele estiver removido ou inativo, também será
        colocado novamente no rodízio.
      </p>

      <label className={styles.campo}>
        Atendente de {nomeUsuario}
        <select value={valor} onChange={(ev) => escolher(ev.target.value)}>
          <option value="">Nenhum (só gestão, fora do rodízio)</option>
          {removido && (
            <option value={valorRestaurar(codigoAtual)}>
              {nomeUsuario} (#{codigoAtual}) — recolocar no rodízio
            </option>
          )}
          {atendentes.map((a) => (
            <option key={a.codigoAtendente} value={a.codigoAtendente}>
              {a.nome}{a.ativo ? "" : " — reativar no rodízio"}
            </option>
          ))}
        </select>
      </label>

      {valor && <CampoEmailTeams valor={emailTeams} onMudar={setEmailTeams} />}

      {removido && valor === valorRestaurar(codigoAtual) && (
        <p className={styles.aviso}>
          O código #{codigoAtual} ficou preservado na conta. {nomeUsuario} será recriado como ativo no fim da fila;
          depois você poderá reordená-lo na aba Rodízio.
        </p>
      )}

      {selecionado && !selecionado.ativo && (
        <p className={styles.aviso}>{selecionado.nome} será reativado na posição que já ocupa no rodízio.</p>
      )}

      {erro && <p className={styles.erro}>{erro}</p>}

      <div className={styles.acoes}>
        <button type="submit" disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar vínculo"}
        </button>
        <button type="button" className="botao-secundario" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
