import { useEffect, useState } from "react";
import type { Atendente } from "../../api/tipos";
import { Esqueleto } from "../../components/Esqueleto";
import { ErroCarregamento } from "../../components/ErroCarregamento";
import { AcaoAtendente } from "./AcaoAtendente";
import styles from "./TabelaAtendentes.module.css";

interface Props {
  atendentes: Atendente[] | null;
  erro: string | null;
  onTentarNovamente: () => void;
  onReordenar: (ordem: string[]) => Promise<void>;
  onDesativar: (nome: string, motivo: string, retornaEm: string | null) => Promise<void>;
  onReativar: (nome: string) => Promise<void>;
  onMudou?: () => void;
}

/**
 * Reordenacao por drag-and-drop nativo HTML5 (handle-only) + setas para
 * touch (o DnD nativo nao responde a toque) - mesmo padrao do painel
 * antigo, os dois caminhos chamam a mesma mutacao.
 */
export function TabelaAtendentes({ atendentes, erro, onTentarNovamente, onReordenar, onDesativar, onReativar, onMudou }: Props) {
  const [lista, setLista] = useState<Atendente[]>([]);
  const [arrastandoIndice, setArrastandoIndice] = useState<number | null>(null);
  const [erroOrdem, setErroOrdem] = useState<string | null>(null);

  useEffect(() => {
    if (atendentes) setLista(atendentes);
  }, [atendentes]);

  async function salvarOrdem(novaLista: Atendente[]) {
    const anterior = lista;
    setLista(novaLista);
    try {
      await onReordenar(novaLista.map((a) => a.nome));
      setErroOrdem(null);
      onMudou?.();
    } catch (err) {
      setLista(anterior);
      setErroOrdem(err instanceof Error ? err.message : String(err));
    }
  }

  function mover(indice: number, direcao: -1 | 1) {
    const alvo = indice + direcao;
    if (alvo < 0 || alvo >= lista.length) return;
    const nova = [...lista];
    [nova[indice], nova[alvo]] = [nova[alvo], nova[indice]];
    salvarOrdem(nova);
  }

  function aoSoltar(indiceDestino: number) {
    if (arrastandoIndice === null || arrastandoIndice === indiceDestino) {
      setArrastandoIndice(null);
      return;
    }
    const nova = [...lista];
    const [movido] = nova.splice(arrastandoIndice, 1);
    nova.splice(indiceDestino, 0, movido);
    setArrastandoIndice(null);
    salvarOrdem(nova);
  }

  async function desativar(nome: string, motivo: string, retornaEm: string | null) {
    await onDesativar(nome, motivo, retornaEm);
    onMudou?.();
  }

  async function reativar(nome: string) {
    await onReativar(nome);
    onMudou?.();
  }

  return (
    <section className={styles.cartao}>
      <h2 className={styles.titulo}>Atendentes</h2>

      {atendentes === null && erro && <ErroCarregamento mensagem={erro} onTentarNovamente={onTentarNovamente} />}
      {atendentes === null && !erro && <Esqueleto linhas={4} />}
      {erroOrdem && <p className={styles.erro}>{erroOrdem}</p>}

      {atendentes !== null && (
        <table>
          <thead>
            <tr>
              <th className={styles.colArrastar}></th>
              <th>Nome</th>
              <th>Status</th>
              <th>Motivo</th>
              <th>Retorna em</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((a, i) => (
              <tr
                key={a.nome}
                className={arrastandoIndice === i ? styles.arrastando : undefined}
                onDragOver={(ev) => ev.preventDefault()}
                onDrop={() => aoSoltar(i)}
              >
                <td className={styles.handleArrastar}>
                  <span
                    className={styles.alca}
                    draggable
                    onDragStart={() => setArrastandoIndice(i)}
                    onDragEnd={() => setArrastandoIndice(null)}
                    title="Arraste para reordenar o rodízio"
                  >
                    ⠿
                  </span>
                  <button
                    type="button"
                    className={styles.botaoMover}
                    onClick={() => mover(i, -1)}
                    disabled={i === 0}
                    aria-label="Subir no rodízio"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className={styles.botaoMover}
                    onClick={() => mover(i, 1)}
                    disabled={i === lista.length - 1}
                    aria-label="Descer no rodízio"
                  >
                    ▼
                  </button>
                </td>
                <td data-rotulo="Nome" className={styles.celulaNome}>
                  {a.nome}
                </td>
                <td data-rotulo="Status">
                  <span className={a.ativo ? styles.badgeAtivo : styles.badgeInativo}>{a.ativo ? "Ativo" : "Inativo"}</span>
                </td>
                <td data-rotulo="Motivo">{a.motivoInatividade || "-"}</td>
                <td data-rotulo="Retorna em">{a.retornaEm || "-"}</td>
                <td data-rotulo="Ação">
                  <AcaoAtendente
                    atendente={a}
                    onDesativar={(motivo, retornaEm) => desativar(a.nome, motivo, retornaEm)}
                    onReativar={() => reativar(a.nome)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
