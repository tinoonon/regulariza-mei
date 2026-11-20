// api/discord/notificar.js
// Serverless Function para enviar notificações ao Discord

const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1572521664103579788/22BBHV0ml-Rz3wHLFMK3eP5i5Ol48qP0cqnq8_IhtLrRSgHbk0hsGfMyNPaQI9I22fHd';

// ── Obter dados de geolocalização do IP ──────
async function obterGeolocalizacao(ip) {
  try {
    // Remove IPv6 local
    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:')) {
      ip = ip.replace('::ffff:', '');
    }

    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,isp,org,as,query`);
    const data = await res.json();
    
    if (data.status === 'success') {
      return {
        ip: data.query,
        pais: data.country,
        estado: data.regionName,
        cidade: data.city,
        isp: data.isp,
        org: data.org
      };
    }
  } catch (err) {
    console.error('[discord] Erro ao obter geolocalização:', err);
  }
  
  return {
    ip: ip,
    pais: 'Desconhecido',
    estado: 'Desconhecido',
    cidade: 'Desconhecido',
    isp: 'Desconhecido',
    org: 'Desconhecido'
  };
}

// ── Extrair informações do dispositivo ──────
function extrairDispositivo(userAgent) {
  if (!userAgent) return 'Desconhecido';

  // Detectar sistema operacional
  let os = 'Desconhecido';
  if (userAgent.includes('Windows NT 10.0')) os = 'Windows 10/11';
  else if (userAgent.includes('Windows NT 6.3')) os = 'Windows 8.1';
  else if (userAgent.includes('Windows NT 6.2')) os = 'Windows 8';
  else if (userAgent.includes('Windows NT 6.1')) os = 'Windows 7';
  else if (userAgent.includes('Mac OS X')) os = 'macOS';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
  else if (userAgent.includes('Linux')) os = 'Linux';

  // Detectar navegador
  let browser = 'Desconhecido';
  if (userAgent.includes('Edg/')) browser = 'Edge';
  else if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) browser = 'Chrome';
  else if (userAgent.includes('Firefox/')) browser = 'Firefox';
  else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) browser = 'Safari';
  else if (userAgent.includes('Opera/') || userAgent.includes('OPR/')) browser = 'Opera';

  // Detectar tipo de dispositivo
  let tipo = 'Desktop';
  if (userAgent.includes('Mobile')) tipo = 'Mobile';
  else if (userAgent.includes('Tablet')) tipo = 'Tablet';

  return `${tipo} - ${os} - ${browser}`;
}

// ── Criar embed do Discord ──────
function criarEmbed(tipo, dados, geo, dispositivo) {
  const cores = {
    acesso: 3447003,      // Azul
    pix_gerado: 15844367, // Laranja
    pagamento: 5763719    // Verde
  };

  const emojis = {
    acesso: '👁️',
    pix_gerado: '💳',
    pagamento: '✅'
  };

  const titulos = {
    acesso: 'Novo Acesso ao Site',
    pix_gerado: 'PIX Gerado',
    pagamento: 'Pagamento Confirmado'
  };

  const embed = {
    title: `${emojis[tipo]} ${titulos[tipo]}`,
    color: cores[tipo],
    timestamp: new Date().toISOString(),
    fields: []
  };

  // Campos específicos por tipo
  if (tipo === 'acesso') {
    embed.fields.push({
      name: '📄 Página',
      value: dados.pagina || 'index.html',
      inline: true
    });
  }

  if (tipo === 'pix_gerado' || tipo === 'pagamento') {
    embed.fields.push(
      {
        name: '🏢 CNPJ',
        value: dados.cnpj || 'Não informado',
        inline: true
      },
      {
        name: '💰 Valor',
        value: dados.valor || 'R$ 79,90',
        inline: true
      }
    );
  }

  if (tipo === 'pix_gerado') {
    embed.fields.push({
      name: '🔖 Protocolo',
      value: dados.protocolo || 'N/A',
      inline: true
    });
  }

  if (tipo === 'pagamento') {
    embed.fields.push(
      {
        name: '🔖 ID Transação',
        value: dados.transacaoId || 'N/A',
        inline: true
      },
      {
        name: '👤 Pagador',
        value: dados.pagadorNome || 'Não informado',
        inline: true
      },
      {
        name: '📅 Pago em',
        value: dados.pagoEm || new Date().toLocaleString('pt-BR'),
        inline: true
      }
    );
  }

  // Informações de localização
  embed.fields.push(
    {
      name: '🌍 Localização',
      value: `${geo.cidade}, ${geo.estado}\n${geo.pais}`,
      inline: true
    },
    {
      name: '📡 IP',
      value: geo.ip,
      inline: true
    },
    {
      name: '🌐 ISP',
      value: geo.isp,
      inline: true
    },
    {
      name: '💻 Dispositivo',
      value: dispositivo,
      inline: false
    }
  );

  return embed;
}

// ── Handler principal ─────────────────────────
export default async function handler(req, res) {
  // Permitir CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder a OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  try {
    const { tipo, dados } = req.body || {};

    console.log('[discord/notificar] Recebida notificação:', { tipo, dados });

    if (!tipo) {
      return res.status(400).json({ erro: 'Tipo de notificação é obrigatório' });
    }

    // Obter IP do visitante
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
            || req.headers['x-real-ip'] 
            || req.socket?.remoteAddress 
            || 'IP desconhecido';

    // Obter User-Agent
    const userAgent = req.headers['user-agent'] || '';

    // Buscar geolocalização
    const geo = await obterGeolocalizacao(ip);

    // Extrair informações do dispositivo
    const dispositivo = extrairDispositivo(userAgent);

    // Criar embed
    const embed = criarEmbed(tipo, dados || {}, geo, dispositivo);

    // Enviar para Discord
    const webhookRes = await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });

    console.log('[discord/notificar] Resposta do webhook Discord:', webhookRes.status);

    if (!webhookRes.ok) {
      const errorText = await webhookRes.text();
      console.error('[discord/notificar] Erro do Discord:', errorText);
      throw new Error(`Discord webhook retornou ${webhookRes.status}`);
    }

    console.log('[discord/notificar] Notificação enviada com sucesso ao Discord!');
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[discord/notificar] Erro:', err);
    return res.status(500).json({ erro: 'Erro ao enviar notificação' });
  }
}
