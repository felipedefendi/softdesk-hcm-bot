import { Navigate } from "react-router-dom";
import { Cartao } from "../../components/Cartao";
import { Esqueleto } from "../../components/Esqueleto";
import { ErroCarregamento } from "../../components/ErroCarregamento";
import { useAuditoria } from "../../hooks/useAuditoria";
import { useAuth } from "../../auth/AuthContext";
import { souAdmin } from "../../lib/permissoes";
import { formatarData } from "../../lib/formatarData";
import styles from "./Auditoria.module.css";

/** Rotulo em portugues pra cada acao registrada - ver src/auditoria.ts pelos valores gravados. */
const ROTULOS: Record<string, string> = {
  "atendente:desativar": "Desativou atendente",
  "atendente:reativar": "Reativou atendente",
  "rodizio:reordenar": "Reordenou o rodízio",
  "rodizio:definir-proximo": "Definiu o próximo",
  "configuracoes:alterar": "Alterou configurações",
  "automacao:pausar": "Pausou a automação",
  "automacao:retomar": "Retomou a automação",
  "agenda:dia-especial:criar": "Cadastrou dia especial",
  "agenda:dia-especial:remover": "Removeu dia especial",
  "agenda:ferias:criar": "Agendou férias",
  "agenda:ferias:remover": "Removeu férias",
  "usuario:criar": "Criou usuário",
  "usuario:gerar-convite": "Gerou link de convite",
  "usuario:mudar-papel": "Mudou o papel",
  "usuario:desativar": "Desativou usuário",
  "usuario:reativar": "Reativou usuário",
};

function rotuloDaAcao(acao: string): string {
  return ROTULOS[acao] ?? acao;
}

export function Auditoria() {
  const { eu } = useAuth();
  const { linhas, erro, recarregar } = useAuditoria();

  // Guarda de UI - o servidor ja recusa /api/auditoria pra quem nao e admin,
  // isto so evita que a tela fique presa "carregando" pra sempre.
  if (!souAdmin(eu)) return <Navigate to="/" replace />;

  return (
    <div className={styles.pagina}>
      <Cartao>
        <h2 className={styles.titulo}>Auditoria</h2>
        <p className={styles.aviso}>Ações administrativas no painel, mais recentes primeiro. Não inclui o Cofre.</p>

        {linhas === null && erro && <ErroCarregamento mensagem={erro} onTentarNovamente={recarregar} />}
        {linhas === null && !erro && <Esqueleto linhas={5} />}
        {linhas !== null && linhas.length === 0 && <p className={styles.vazio}>Nenhuma ação registrada ainda.</p>}

        {linhas !== null && linhas.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Quem</th>
                <th>Ação</th>
                <th>Detalhe</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr key={i}>
                  <td data-rotulo="Quando" className="tabular">
                    {formatarData(l.quando)}
                  </td>
                  <td data-rotulo="Quem">{l.quem}</td>
                  <td data-rotulo="Ação">{rotuloDaAcao(l.acao)}</td>
                  <td data-rotulo="Detalhe">{l.detalhe || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Cartao>
    </div>
  );
}
