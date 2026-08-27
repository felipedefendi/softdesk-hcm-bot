import https from "node:https";
import tls from "node:tls";

/**
 * Contorno emergencial para o certificado da API da Senior que expirou em
 * 26/08/2026. O TLS normal continua sendo o primeiro caminho; isto so roda
 * quando o Node devolve exatamente CERT_HAS_EXPIRED.
 *
 * Mesmo aceitando a data vencida, a identidade continua presa ao certificado
 * que verificamos manualmente nos dois IPs publicados pela Senior. Se o host,
 * o fingerprint ou qualquer outro erro TLS mudar, a senha nao e enviada.
 * Depois do prazo abaixo o contorno se desliga sozinho.
 */
const HOST_PERMITIDO = "api.senior.com.br";
const FINGERPRINT_SHA256_PERMITIDO = "5F:CB:DD:F7:56:47:2F:B9:41:BA:52:0C:96:DA:85:B1:51:AF:E9:0D:69:BE:15:16:FB:A9:E8:C1:07:9C:66:D0";
export const CONTORNO_ATE = Date.parse("2026-08-31T23:59:59Z");

interface ErroComCausa {
  code?: unknown;
  cause?: { code?: unknown };
}

export function erroEhCertificadoExpirado(erro: unknown): boolean {
  if (!erro || typeof erro !== "object") return false;
  const candidato = erro as ErroComCausa;
  return candidato.code === "CERT_HAS_EXPIRED" || candidato.cause?.code === "CERT_HAS_EXPIRED";
}

export function contornoEstaAtivo(agora = Date.now()): boolean {
  return agora <= CONTORNO_ATE;
}

function falha(mensagem: string): Error {
  return new Error(`Contorno TLS da Senior recusado: ${mensagem}`);
}

/** Retorna null apenas quando e seguro reutilizar o certificado expirado. */
export function validarCertificadoTemporario(
  hostname: string,
  erroAutorizacao: string | Error | null,
  certificado: tls.PeerCertificate,
  agora = Date.now()
): Error | null {
  if (!contornoEstaAtivo(agora)) return falha("prazo expirado");
  if (hostname !== HOST_PERMITIDO) return falha("host diferente do permitido");

  const codigo = typeof erroAutorizacao === "string" ? erroAutorizacao : (erroAutorizacao as NodeJS.ErrnoException | null)?.code;
  if (codigo !== "CERT_HAS_EXPIRED") return falha(`erro TLS inesperado: ${codigo ?? "nenhum"}`);

  const erroHostname = tls.checkServerIdentity(hostname, certificado);
  if (erroHostname) return falha(`hostname invalido: ${erroHostname.message}`);

  if (certificado.fingerprint256?.toUpperCase() !== FINGERPRINT_SHA256_PERMITIDO) {
    return falha("fingerprint diferente do certificado verificado");
  }

  return null;
}

function conectarComCertificadoPinado(url: URL): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    if (url.protocol !== "https:" || url.hostname !== HOST_PERMITIDO) {
      reject(falha("URL fora do endpoint permitido"));
      return;
    }

    const socket = tls.connect({
      host: url.hostname,
      port: Number(url.port || 443),
      servername: url.hostname,
      rejectUnauthorized: false,
      ALPNProtocols: ["http/1.1"],
    });

    let concluido = false;
    socket.once("secureConnect", () => {
      const erro = validarCertificadoTemporario(url.hostname, socket.authorizationError, socket.getPeerCertificate());
      if (erro) {
        concluido = true;
        socket.destroy();
        reject(erro);
        return;
      }
      concluido = true;
      resolve(socket);
    });
    socket.once("error", (erro) => {
      if (!concluido) reject(erro);
    });
    socket.setTimeout(15_000, () => socket.destroy(new Error("Timeout na conexao TLS temporaria da Senior")));
  });
}

/**
 * Faz somente o POST de login, depois que a conexao TLS ja foi validada pela
 * pinagem acima. A senha vai no corpo, nunca em argumento de processo ou log.
 */
export async function postarLoginComCertificadoTemporario(urlTexto: string, corpo: string): Promise<Response> {
  const url = new URL(urlTexto);
  const socket = await conectarComCertificadoPinado(url);
  // O Agent recebe um socket TLS que ja concluiu o handshake e ja passou pela
  // pinagem. Assim o https.request nao abre uma segunda conexao com a validacao
  // padrao (que naturalmente recusaria a data vencida).
  const agente = new https.Agent({ keepAlive: false, maxSockets: 1 });
  agente.createConnection = () => socket;

  return new Promise((resolve, reject) => {
    const requisicao = https.request(
      url,
      {
        method: "POST",
        agent: agente,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(corpo),
          Connection: "close",
        },
      },
      (resposta) => {
        const partes: Buffer[] = [];
        resposta.on("data", (parte: Buffer) => partes.push(parte));
        resposta.on("end", () => {
          const headers = new Headers();
          for (const [nome, valor] of Object.entries(resposta.headers)) {
            if (Array.isArray(valor)) valor.forEach((item) => headers.append(nome, item));
            else if (valor !== undefined) headers.set(nome, String(valor));
          }
          resolve(
            new Response(Buffer.concat(partes), {
              status: resposta.statusCode ?? 500,
              statusText: resposta.statusMessage,
              headers,
            })
          );
        });
      }
    );

    requisicao.once("error", reject);
    requisicao.setTimeout(15_000, () => requisicao.destroy(new Error("Timeout no login temporario da Senior")));
    requisicao.end(corpo);
  });
}
