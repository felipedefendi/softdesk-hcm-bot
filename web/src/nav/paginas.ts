import type { ComponentType } from "react";
import { LayoutDashboard, ListChecks, Users, CalendarDays, History, HeartPulse, Lock, Settings, UserCog, ShieldCheck } from "lucide-react";

export interface PaginaNav {
  path: string;
  rotulo: string;
  Icone: ComponentType<{ size?: number; strokeWidth?: number }>;
  /** So aparece pra quem e admin (ver src/lib/permissoes.ts). */
  soAdmin?: boolean;
}

export const PAGINAS: PaginaNav[] = [
  { path: "/", rotulo: "Visão geral", Icone: LayoutDashboard },
  { path: "/fila", rotulo: "Fila ao vivo", Icone: ListChecks },
  { path: "/equipe", rotulo: "Rodízio & equipe", Icone: Users },
  { path: "/agenda", rotulo: "Agenda", Icone: CalendarDays },
  { path: "/historico", rotulo: "Histórico", Icone: History },
  { path: "/saude", rotulo: "Saúde do bot", Icone: HeartPulse },
  { path: "/cofre", rotulo: "Cofre", Icone: Lock },
  { path: "/usuarios", rotulo: "Usuários", Icone: UserCog, soAdmin: true },
  { path: "/auditoria", rotulo: "Auditoria", Icone: ShieldCheck, soAdmin: true },
  { path: "/configuracoes", rotulo: "Configurações", Icone: Settings },
];
