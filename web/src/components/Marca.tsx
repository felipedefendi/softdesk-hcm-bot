interface Props {
  tamanho?: number;
}

/**
 * Simbolo do painel: tres arcos iguais girando em torno de um ponto central -
 * os atendentes e a vez de quem esta ativo. SVG inline em vez de <img> porque
 * assim herda var(--acento) e acompanha o tema sozinho, sem precisar de um
 * arquivo por tema nem de um request extra.
 */
export function Marca({ tamanho = 22 }: Props) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0, display: "block" }}
    >
      {/* A circunferencia e 2*pi*11 = 69.1, entao 16.7 de traco + 6.33 de vao
          repetido tres vezes fecha a volta com os arcos exatamente iguais. */}
      <circle
        cx="16"
        cy="16"
        r="11"
        fill="none"
        stroke="var(--acento)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray="16.7 6.33"
        transform="rotate(-90 16 16)"
      />
      <circle cx="16" cy="16" r="3.6" fill="var(--acento)" />
    </svg>
  );
}
