/* ============================================
   DISCORD TRACKER — Notificações automáticas
   ============================================ */

// ── Função para enviar notificação ao Discord ──
async function notificarDiscord(tipo, dados) {
  try {
    await fetch('/api/discord/notificar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: tipo, dados: dados })
    });
  } catch (err) {
    // Falha silenciosa — não impacta a experiência do usuário
    console.error('[discord] Erro ao notificar:', err);
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
