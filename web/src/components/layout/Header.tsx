import { Link } from "react-router-dom";
import { Menu, Sun, Moon, LogOut, User } from "lucide-react";
import { useTema } from "../../hooks/useTema";
import { useAuth } from "../../auth/AuthContext";
import { useAutomacao } from "../../hooks/useAutomacao";
import styles from "./Header.module.css";

interface Props {
  titulo: string;
  onAbrirDrawer: () => void;
}

export function Header({ titulo, onAbrirDrawer }: Props) {
  const [tema, alternarTema] = useTema();
  const { sair, eu } = useAuth();
  const { ativa } = useAutomacao();

  return (
    <header className={styles.header}>
      <div className={styles.esquerda}>
        <button className={styles.botaoMenu} onClick={onAbrirDrawer} aria-label="Abrir menu" type="button">
          <Menu size={20} strokeWidth={1.5} />
        </button>
        <h1 className={styles.titulo}>{titulo}</h1>
      </div>

      <div className={styles.direita}>
        {ativa !== null && (
          <span className={[styles.chip, ativa ? styles.chipAtivo : styles.chipInativo].join(" ")}>
            {ativa ? "Automação ativa" : "Automação pausada"}
          </span>
        )}
        {/* Sessao legada (senha compartilhada) nao tem conta propria - sem perfil pra editar. */}
        {eu?.tipo === "pessoa" && (
          <Link to="/perfil" className={styles.botaoIcone} aria-label="Meu perfil">
            <User size={19} strokeWidth={1.5} />
          </Link>
        )}
        <button
          className={styles.botaoIcone}
          onClick={alternarTema}
          type="button"
          aria-label={tema === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
        >
          {tema === "dark" ? <Sun size={19} strokeWidth={1.5} /> : <Moon size={19} strokeWidth={1.5} />}
        </button>
        <button className={styles.botaoSecundario} onClick={sair} type="button">
          <LogOut size={16} strokeWidth={1.5} />
          Sair
        </button>
      </div>
    </header>
  );
}
