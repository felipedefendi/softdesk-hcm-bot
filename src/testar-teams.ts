/** Dispara uma notificacao de teste no Teams para validar o Adaptive Card. */
import { notificarTeams } from "./teams";

notificarTeams({
  chamado: 99999,
  titulo: "[TESTE] Mensagem de teste do bot de revezamento",
  cliente: "Cliente de teste",
  atendente: "Felipe Prado",
  minutosEncaminhamento: 15,
})
  .then(() => console.log("Notificacao de teste enviada (ver console acima se houve erro)."))
  .catch((err) => console.error("Erro:", err));
