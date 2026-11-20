// api/pix/status.js
// Vercel Serverless Function — consulta status de um PIX na Profanus Pay
// Usada pelo frontend para polling enquanto aguarda pagamento
// Variável de ambiente: PROFANUS_API_KEY

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const apiKey = process.env.PROFANUS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ erro: 'Configuração do servidor incompleta' });
  }

  // Aceita ?id=<transacaoId ou externalId>
  const { id } = req.query;
  if (!id || id.trim() === '') {
    return res.status(400).json({ erro: 'Parâmetro id é obrigatório' });
  }

  try {
    const upstream = await fetch(
      `https://profanuspay.com/api/pix/${encodeURIComponent(id.trim())}`,
      {
        method:  'GET',
        headers: { 'x-api-key': apiKey },
      }
    );

    if (upstream.status === 404) {
      return res.status(404).json({ erro: 'Transação não encontrada' });
    }

    if (upstream.status === 401) {
      console.error('[pix/status] API Key inválida');
      return res.status(500).json({ erro: 'Erro de autenticação com o gateway' });
    }

    if (!upstream.ok) {
      return res.status(502).json({ erro: 'Erro ao consultar o gateway' });
    }

    const data = await upstream.json();

    // Retorna apenas o que o frontend precisa
    return res.status(200).json({
      transacaoId:   data.id,
      externalId:    data.external_id,
      status:        data.status,          // pending | paid | expired | cancelled
      valor:         data.amount,
      pixCopiaECola: data.pix_copia_cola,
      qrCodeBase64:  data.qr_code_base64,
      expiracao:     data.expires_at,
      pagadorNome:   data.payer_name   || null,
      pago:          data.status === 'paid',
      pago_em:       data.paid_at      || null,
    });

  } catch (err) {
    console.error('[pix/status] Erro de rede:', err);
    return res.status(502).json({ erro: 'Falha de comunicação com o gateway' });
  }
}
