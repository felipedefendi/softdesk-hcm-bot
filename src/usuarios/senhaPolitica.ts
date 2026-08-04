/**
 * Validacao de senha, funcao pura. Regra da entrevista: minimo 8 caracteres,
 * com maiuscula, numero e simbolo.
 */

const TAMANHO_MINIMO = 8;
const TEM_MAIUSCULA = /[A-Z]/;
const TEM_NUMERO = /[0-9]/;
/** Qualquer coisa que nao seja letra, numero ou espaco conta como simbolo. */
const TEM_SIMBOLO = /[^A-Za-z0-9\s]/;

/** Lista de motivos, vazia se a senha atende a politica. */
export function validarSenha(senha: string): string[] {
  const motivos: string[] = [];

  if (senha.length < TAMANHO_MINIMO) motivos.push(`Precisa ter pelo menos ${TAMANHO_MINIMO} caracteres.`);
  if (!TEM_MAIUSCULA.test(senha)) motivos.push("Precisa ter pelo menos uma letra maiúscula.");
  if (!TEM_NUMERO.test(senha)) motivos.push("Precisa ter pelo menos um número.");
  if (!TEM_SIMBOLO.test(senha)) motivos.push("Precisa ter pelo menos um símbolo.");

  return motivos;
}

export function senhaValida(senha: string): boolean {
  return validarSenha(senha).length === 0;
}
