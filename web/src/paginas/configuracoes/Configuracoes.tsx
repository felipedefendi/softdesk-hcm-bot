import { useEffect, useState, type FormEvent } from "react";
import { Cartao } from "../../components/Cartao";
import { useConfiguracoes } from "../../hooks/useConfiguracoes";
import styles from "./Configuracoes.module.css";

export function Configuracoes() {
  const { config, erro, salvar } = useConfiguracoes();
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
        {erro && <p className={styles.erro}>{erro}</p>}

        <form onSubmit={aoSalvar} className={styles.form}>
          <label className={styles.campo}>
            Intervalo de verificação (min)
            <input type="number" min={1} value={intervalo} onChange={(ev) => setIntervalo(ev.target.value)} />
          </label>
          <label className={styles.campo}>
            Limite SLA (min)
            <input type="number" min={1} value={limite} onChange={(ev) => setLimite(ev.target.value)} />
          </label>
          <label className={styles.campo}>
            Alerta de rodízio (dias úteis)
            <input type="number" min={1} value={diasAlerta} onChange={(ev) => setDiasAlerta(ev.target.value)} />
          </label>
          <button type="submit" disabled={salvando}>
            Salvar
          </button>
        </form>
        <p className={styles.mensagem}>{mensagem ?? ""}</p>
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
