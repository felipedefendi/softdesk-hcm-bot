import { useEffect, useState, type FormEvent } from "react";
import { Cartao } from "../../components/Cartao";
import { Esqueleto } from "../../components/Esqueleto";
import { ErroCarregamento } from "../../components/ErroCarregamento";
import { useConfiguracoes } from "../../hooks/useConfiguracoes";
import { useAuth } from "../../auth/AuthContext";
import { souAdmin } from "../../lib/permissoes";
import styles from "./Configuracoes.module.css";

export function Configuracoes() {
  const { config, erro, recarregar, salvar } = useConfiguracoes();
  const { eu } = useAuth();
  const admin = souAdmin(eu);
  const [intervalo, setIntervalo] = useState("");
  const [limite, setLimite] = useState("");
  const [diasAlerta, setDiasAlerta] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      setIntervalo(String(config.pollIntervalMinutes));
      setLimite(String(config.encaminhamentoLimiteMinutos));
      setDiasAlerta(String(config.diasSemReceberParaAlerta));
    }
  }, [config]);

  async function aoSalvar(ev: FormEvent) {
    ev.preventDefault();
    setSalvando(true);
    setMensagem(null);
    try {
      await salvar({
        pollIntervalMinutes: Number(intervalo),
        encaminhamentoLimiteMinutos: Number(limite),
        diasSemReceberParaAlerta: Number(diasAlerta),
      });
      setMensagem("Configurações salvas. Valem a partir do próximo ciclo do bot.");
    } catch (err) {
      setMensagem(`Erro: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className={styles.pagina}>
      <Cartao>
        <h2 className={styles.titulo}>Configurações</h2>

        {config === null && erro && <ErroCarregamento mensagem={erro} onTentarNovamente={recarregar} />}
        {config === null && !erro && <Esqueleto linhas={3} />}

        {config !== null && (
          <>
            <form onSubmit={aoSalvar} className={styles.form}>
              <label className={styles.campo}>
                Intervalo de verificação (min)
                <input type="number" min={1} value={intervalo} onChange={(ev) => setIntervalo(ev.target.value)} disabled={!admin} />
              </label>
              <label className={styles.campo}>
                Limite SLA (min)
                <input type="number" min={1} value={limite} onChange={(ev) => setLimite(ev.target.value)} disabled={!admin} />
              </label>
              <label className={styles.campo}>
                Alerta de rodízio (dias úteis)
                <input type="number" min={1} value={diasAlerta} onChange={(ev) => setDiasAlerta(ev.target.value)} disabled={!admin} />
              </label>
              {admin && (
                <button type="submit" disabled={salvando}>
                  Salvar
                </button>
              )}
            </form>
            {!admin && <p className={styles.mensagem}>Somente administradores podem alterar.</p>}
            <p className={styles.mensagem}>{mensagem ?? ""}</p>
          </>
        )}
      </Cartao>

      <Cartao className={styles.placeholder}>
        <h2 className={styles.titulo}>Usuários</h2>
        <p className={styles.textoPlaceholder}>
          Em breve: uma conta por pessoa do time, com permissões próprias. Por enquanto, o acesso ao painel continua
          por senha única.
        </p>
      </Cartao>
    </div>
  );
}
