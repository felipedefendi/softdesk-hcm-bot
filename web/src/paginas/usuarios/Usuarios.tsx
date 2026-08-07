import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Plus, Copy, ShieldCheck, ShieldOff, UserX, UserCheck, Pencil } from "lucide-react";
import { Cartao } from "../../components/Cartao";
import { DrawerLateral } from "../../components/DrawerLateral";
import { Esqueleto } from "../../components/Esqueleto";
import { ErroCarregamento } from "../../components/ErroCarregamento";
import { useUsuarios } from "../../hooks/useUsuarios";
import { useAtendentes } from "../../hooks/useAtendentes";
import { useAuth } from "../../auth/AuthContext";
import { souAdmin } from "../../lib/permissoes";
import type { NovoUsuarioEntrada } from "../../api/tipos";
import { FormularioUsuario } from "./FormularioUsuario";
import { FormularioEmail } from "./FormularioEmail";
import styles from "./Formularios.module.css";
import paginaStyles from "./Usuarios.module.css";

type Drawer =
  | { tipo: "fechado" }
  | { tipo: "novo" }
  | { tipo: "link"; nome: string; link: string }
  | { tipo: "editarEmail"; id: string; nome: string; email: string };

function linkCompleto(token: string): string {
  return `${window.location.origin}/convite/${token}`;
}

export function Usuarios() {
  const { eu } = useAuth();
  const { usuarios, erro, recarregar, criar, mudarPapel, mudarEmail, desativar, reativar } = useUsuarios();
  const { atendentes } = useAtendentes();
  const [drawer, setDrawer] = useState<Drawer>({ tipo: "fechado" });
  const [copiado, setCopiado] = useState(false);

  // Guarda de UI - o servidor ja recusa qualquer coisa aqui pra quem nao e
  // admin, isto so evita que a tela fique presa "carregando" pra sempre.
  if (!souAdmin(eu)) return <Navigate to="/" replace />;

  function nomeDoAtendente(codigo: number | null): string {
    if (codigo === null) return "—";
    return atendentes?.find((a) => a.codigoAtendente === codigo)?.nome ?? `#${codigo}`;
  }

  async function aoCriar(entrada: NovoUsuarioEntrada) {
    const { usuario, tokenConvite } = await criar(entrada);
    setDrawer({ tipo: "link", nome: usuario.nome, link: linkCompleto(tokenConvite) });
  }

  // mudarPapel/desativar/reativar podem bater em erro do servidor (ultimo admin,
  // auto-desativacao, usuario nao encontrado) - sem isto o clique falharia calado.
  async function comAlertaDeErro(acao: () => Promise<unknown>) {
    try {
      await acao();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }

  async function aoEditarEmail(email: string) {
    if (drawer.tipo !== "editarEmail") return;
    await mudarEmail(drawer.id, email);
    setDrawer({ tipo: "fechado" });
  }

  async function copiar(link: string) {
    await navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className={paginaStyles.pagina}>
      <Cartao>
        <div className={paginaStyles.cabecalho}>
          <h2 className={paginaStyles.titulo}>Usuários</h2>
          <button type="button" onClick={() => setDrawer({ tipo: "novo" })}>
            <Plus size={16} strokeWidth={2} /> Nova conta
          </button>
        </div>

        {usuarios === null && erro && <ErroCarregamento mensagem={erro} onTentarNovamente={recarregar} />}
        {usuarios === null && !erro && <Esqueleto linhas={3} />}

        {usuarios !== null && (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Usuário SeniorX</th>
                <th>Papel</th>
                <th>Atendente</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td data-rotulo="Nome">{u.nome}</td>
                  {/* So o usuario; o dominio (@tenant) e igual pra todos, entao fica no title pra conferir. */}
                  <td data-rotulo="Usuário SeniorX" title={u.email}>{u.email.split("@")[0]}</td>
                  <td data-rotulo="Papel">{u.papel === "admin" ? "Administrador" : "Comum"}</td>
                  <td data-rotulo="Atendente">{nomeDoAtendente(u.codigoAtendente)}</td>
                  <td data-rotulo="Status">
                    <span className={u.ativo ? paginaStyles.badgeAtivo : paginaStyles.badgeInativo}>
                      {u.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td data-rotulo="Ações" className={paginaStyles.acoesCelula}>
                    <button
                      type="button"
                      className={paginaStyles.botaoIcone}
                      title="Editar nome de usuário"
                      aria-label={`Editar nome de usuário: ${u.nome}`}
                      onClick={() => setDrawer({ tipo: "editarEmail", id: u.id, nome: u.nome, email: u.email })}
                    >
                      <Pencil size={14} strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      className={paginaStyles.botaoIcone}
                      title={u.papel === "admin" ? "Tornar comum" : "Tornar admin"}
                      aria-label={`${u.papel === "admin" ? "Tornar comum" : "Tornar admin"}: ${u.nome}`}
                      onClick={() => comAlertaDeErro(() => mudarPapel(u.id, u.papel === "admin" ? "comum" : "admin"))}
                    >
                      {u.papel === "admin" ? <ShieldOff size={14} strokeWidth={1.5} /> : <ShieldCheck size={14} strokeWidth={1.5} />}
                    </button>
                    <button
                      type="button"
                      className={paginaStyles.botaoIcone}
                      title={u.ativo ? "Desativar" : "Reativar"}
                      aria-label={`${u.ativo ? "Desativar" : "Reativar"}: ${u.nome}`}
                      onClick={() => comAlertaDeErro(() => (u.ativo ? desativar(u.id) : reativar(u.id)))}
                    >
                      {u.ativo ? <UserX size={14} strokeWidth={1.5} /> : <UserCheck size={14} strokeWidth={1.5} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Cartao>

      <DrawerLateral
        aberto={drawer.tipo !== "fechado"}
        titulo={
          drawer.tipo === "novo"
            ? "Nova conta"
            : drawer.tipo === "link"
              ? "Link de acesso"
              : drawer.tipo === "editarEmail"
                ? "Editar nome de usuário"
                : ""
        }
        onFechar={() => setDrawer({ tipo: "fechado" })}
      >
        {drawer.tipo === "novo" && (
          <FormularioUsuario atendentes={atendentes ?? []} onSalvar={aoCriar} onCancelar={() => setDrawer({ tipo: "fechado" })} />
        )}

        {drawer.tipo === "editarEmail" && (
          <FormularioEmail emailAtual={drawer.email} onSalvar={aoEditarEmail} onCancelar={() => setDrawer({ tipo: "fechado" })} />
        )}

        {drawer.tipo === "link" && (
          <div className={styles.linkBloco}>
            <p className={styles.linkAviso}>
              Copie este link agora e envie para <strong>{drawer.nome}</strong> pelo Teams — ele não aparece de novo.
              É de uso único e expira em 7 dias.
            </p>
            <div className={styles.linkCampo}>
              <input value={drawer.link} readOnly onFocus={(ev) => ev.target.select()} />
              <button type="button" className="botao-secundario" onClick={() => copiar(drawer.link)}>
                <Copy size={14} strokeWidth={1.5} /> {copiado ? "Copiado" : "Copiar"}
              </button>
            </div>
            <button type="button" onClick={() => setDrawer({ tipo: "fechado" })}>
              Concluir
            </button>
          </div>
        )}
      </DrawerLateral>
    </div>
  );
}
