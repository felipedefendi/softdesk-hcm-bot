import type { ReactNode } from "react";
import styles from "./Cartao.module.css";

interface Props {
  children: ReactNode;
  className?: string;
}

export function Cartao({ children, className }: Props) {
  return <section className={[styles.cartao, className].filter(Boolean).join(" ")}>{children}</section>;
}
