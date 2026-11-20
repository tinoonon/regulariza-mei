// api/pix/criar.js
// Vercel Serverless Function — cria cobrança PIX na Profanus Pay
// Variável de ambiente necessária:
//   PROFANUS_API_KEY   → x-api-key da Profanus Pay

const PROFANUS_URL = 'https://profanuspay.com/api/pix/create';
const VALOR_TAXA   = 0.50;
const EXPIRACAO_S  = 172800; // 48 horas em segundos

// ── Retry com backoff exponencial ────────────
async function fetchComRetry(url, options, tentativas = 3) {
  let ultimoErro;
  for (let i = 0; i < tentativas; i++) {
    try {
      const res = await fetch(url, options);

      // 429 e 5xx: vale tentar de novo
      if ((res.status === 429 || res.status >= 500) && i < tentativas - 1) {
        const espera = Math.pow(2, i) * 500; // 500ms, 1s, 2s
        await new Promise(r => setTimeout(r, espera));
        continue;
      }

      return res;
    } catch (err) {
      // Falha de rede — tenta de novo
      ultimoErro = err;
      if (i < tentativas - 1) {
        const espera = Math.pow(2, i) * 500;
        await new Promise(r => setTimeout(r, espera));
      }
    }
  }
  throw ultimoErro || new Error('Falha após todas as tentativas');
}

// ── Handler principal ─────────────────────────
export default async function handler(req, res) {
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const apiKey = process.env.PROFANUS_API_KEY;
  if (!apiKey) {
    console.error('[pix/criar] PROFANUS_API_KEY não configurada');
    return res.status(500).json({ erro: 'Configuração do servidor incompleta' });
  }

  const { cnpj, protocolo } = req.body || {};

  if (!cnpj || !protocolo) {
    return res.status(400).json({ erro: 'cnpj e protocolo são obrigatórios' });
  }

  // external_id = protocolo garante idempotência:
  // se o usuário recarregar a página, recebe a mesma cobrança
  const externalId = protocolo;

  const payload = {
    amount:      VALOR_TAXA,
    description: `Regularização MEI — CNPJ ${cnpj}`,
    external_id: externalId,
    expiration:  EXPIRACAO_S,
  };

  try {
    const upstream = await fetchComRetry(PROFANUS_URL, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await upstream.json();

    // ── Mapeamento de erros da Profanus Pay ──
    if (upstream.status === 400) {
      return res.status(400).json({
        erro: 'Dados inválidos para gerar o PIX.',
        detalhe: data?.message || null,
      });
    }

    if (upstream.status === 401) {
      console.error('[pix/criar] API Key inválida');
      return res.status(500).json({ erro: 'Erro de autenticação com o gateway' });
    }

    if (upstream.status === 429) {
      return res.status(429).json({ erro: 'Muitas requisições. Tente em instantes.' });
    }

    if (upstream.status === 409) {
      // Idempotência: cobrança já existe — retorna a existente normalmente
      if (data?.transaction) {
        return res.status(200).json(mapearResposta(data.transaction));
      }
      return res.status(409).json({ erro: 'Conflito de cobrança existente.' });
    }

    if (upstream.status >= 500) {
      return res.status(502).json({ erro: 'Gateway de pagamento indisponível. Tente novamente.' });
    }

    if (!data?.success || !data?.transaction) {
      return res.status(502).json({ erro: 'Resposta inesperada do gateway.' });
    }

    return res.status(200).json(mapearResposta(data.transaction));

  } catch (err) {
    console.error('[pix/criar] Erro de rede:', err);
    return res.status(502).json({ erro: 'Falha de comunicação com o gateway de pagamento.' });
  }
}

// ── Monta objeto seguro para o frontend ──────
// Nunca expõe dados internos desnecessários
function mapearResposta(tx) {
  return {
    transacaoId:   tx.id,
    externalId:    tx.external_id,
    valor:         tx.amount,
    status:        tx.status,
    pixCopiaECola: tx.pix_copia_cola,
    qrCodeBase64:  tx.qr_code_base64,
    expiracao:     tx.expires_at,
  };
}
