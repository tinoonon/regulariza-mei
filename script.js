/* ============================================
   REGULARIZAÇÃO MEI — SCRIPT PRINCIPAL
   ============================================ */

// ── Utilitários de data ──────────────────────

function formatarData(data) {
  var d = String(data.getDate()).padStart(2, '0');
  var m = String(data.getMonth() + 1).padStart(2, '0');
  var y = data.getFullYear();
  return d + '/' + m + '/' + y;
}

function formatarDataHora(data) {
  return formatarData(data) + ' ' +
    String(data.getHours()).padStart(2, '0') + ':' +
    String(data.getMinutes()).padStart(2, '0');
}

// A BrasilAPI retorna data_inicio_atividade como "YYYY-MM-DD"
function formatarDataISO(str) {
  if (!str) return '—';
  var partes = str.split('-');
  if (partes.length === 3) return partes[2] + '/' + partes[1] + '/' + partes[0];
  return str;
}

window.formatarData     = formatarData;
window.formatarDataHora = formatarDataHora;


// ── Máscara de CNPJ ──────────────────────────

function aplicarMascaraCNPJ(valor) {
  valor = valor.replace(/\D/g, '').substring(0, 14);
  if (valor.length > 12)      valor = valor.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
  else if (valor.length > 8)  valor = valor.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/,         '$1.$2.$3/$4');
  else if (valor.length > 5)  valor = valor.replace(/^(\d{2})(\d{3})(\d{0,3})/,                 '$1.$2.$3');
  else if (valor.length > 2)  valor = valor.replace(/^(\d{2})(\d{0,3})/,                        '$1.$2');
  return valor;
}


// ── Validação de CNPJ ────────────────────────

function validarCNPJ(cnpj) {
  cnpj = cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  function calcDV(base, pesos) {
    var soma = 0;
    for (var i = 0; i < base.length; i++) soma += parseInt(base[i]) * pesos[i];
    var r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  }

  var dv1 = calcDV(cnpj.substring(0, 12), [5,4,3,2,9,8,7,6,5,4,3,2]);
  var dv2 = calcDV(cnpj.substring(0, 13), [6,5,4,3,2,9,8,7,6,5,4,3,2]);
  return parseInt(cnpj[12]) === dv1 && parseInt(cnpj[13]) === dv2;
}

function formatarCNPJ(cnpj) {
  cnpj = cnpj.replace(/\D/g, '');
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}


// ── CAPTCHA MATEMÁTICO PRÓPRIO ───────────────

var captchaA = 0;
var captchaB = 0;

function gerarCaptcha() {
  captchaA = Math.floor(Math.random() * 9) + 1;
  captchaB = Math.floor(Math.random() * 9) + 1;

  var elA     = document.getElementById('captcha-a');
  var elB     = document.getElementById('captcha-b');
  var elInput = document.getElementById('captcha-answer');
  var elErr   = document.getElementById('captcha-error');

  if (elA) elA.textContent = captchaA;
  if (elB) elB.textContent = captchaB;
  if (elInput) { elInput.value = ''; elInput.classList.remove('is-invalid'); }
  if (elErr)   elErr.textContent = '';
}

function validarCaptcha() {
  var input = document.getElementById('captcha-answer');
  if (!input) return true;

  var resposta = parseInt(input.value.trim(), 10);
  if (isNaN(resposta) || resposta !== captchaA + captchaB) {
    input.classList.add('is-invalid');
    var elErr = document.getElementById('captcha-error');
    if (elErr) elErr.textContent = 'Resposta incorreta. Tente novamente.';
    gerarCaptcha();
    return false;
  }
  return true;
}


// ── UI helpers ───────────────────────────────

function mostrarErro(inputEl, errorEl, msg) {
  if (inputEl) inputEl.classList.add('is-invalid');
  if (errorEl) errorEl.textContent = msg;
}

function mostrarLoading(show) {
  var submitBtn = document.getElementById('submitBtn');
  var loading   = document.getElementById('loading');
  if (show) {
    if (submitBtn) submitBtn.style.display = 'none';
    if (loading)   loading.style.display   = 'flex';
  } else {
    if (submitBtn) submitBtn.style.display = '';
    if (loading)   loading.style.display   = 'none';
  }
}


// ── Consulta CNPJ — BrasilAPI + fallback ReceitaWS ──

function consultarCNPJ(cnpjLimpo) {
  return fetch('https://brasilapi.com.br/api/cnpj/v1/' + cnpjLimpo, { mode: 'cors' })
    .then(function (res) {
      if (res.status === 404) throw new Error('not_found');
      if (res.status === 429) throw new Error('rate_limit');
      if (!res.ok) throw new Error('brasilapi_error');
      return res.json().then(function (data) { return { fonte: 'brasilapi', data: data }; });
    })
    .catch(function (err) {
      if (err.message === 'not_found')  throw new Error('CNPJ não encontrado na base da Receita Federal.');
      if (err.message === 'rate_limit') throw new Error('Muitas consultas em pouco tempo. Aguarde e tente novamente.');

      // Fallback: tenta ReceitaWS
      return fetch('https://www.receitaws.com.br/v1/cnpj/' + cnpjLimpo, { mode: 'cors' })
        .then(function (res2) {
          if (!res2.ok) throw new Error('api_error');
          return res2.json().then(function (data2) {
            if (data2.status === 'ERROR') throw new Error('not_found');
            return { fonte: 'receitaws', data: data2 };
          });
        })
        .catch(function (err2) {
          if (err2.message === 'not_found') throw new Error('CNPJ não encontrado na base da Receita Federal.');
          throw new Error('Não foi possível consultar o CNPJ. Verifique sua conexão e tente novamente.');
        });
    });
}

function normalizarDados(resultado) {
  var fonte = resultado.fonte;
  var api   = resultado.data;

  var titular   = '—';
  var municipio = '—';
  var cnae      = '—';
  var fantasia  = '—';
  var abertura  = '—';
  var razao     = '—';
  var cnpj      = '—';

  if (fonte === 'brasilapi') {
    // BrasilAPI: campos snake_case
    cnpj     = formatarCNPJ(api.cnpj || '');
    razao    = api.razao_social || '—';
    fantasia = (api.nome_fantasia && api.nome_fantasia.trim()) ? api.nome_fantasia : '—';
    abertura = formatarDataISO(api.data_inicio_atividade);
    cnae     = api.cnae_fiscal_descricao || '—';

    if (api.municipio && api.uf) municipio = api.municipio + ' / ' + api.uf;

    if (api.qsa && api.qsa.length > 0) {
      titular = api.qsa[0].nome_socio || api.qsa[0].nome || '—';
    }

  } else {
    // ReceitaWS: campos diferentes
    cnpj     = formatarCNPJ((api.cnpj || '').replace(/\D/g, ''));
    razao    = api.nome || '—';
    fantasia = (api.fantasia && api.fantasia.trim()) ? api.fantasia : '—';
    abertura = api.abertura || '—';    // já vem como "DD/MM/AAAA"
    cnae     = (api.atividade_principal && api.atividade_principal[0])
                 ? api.atividade_principal[0].text
                 : '—';

    if (api.municipio && api.uf) municipio = api.municipio + ' / ' + api.uf;

    if (api.qsa && api.qsa.length > 0) {
      titular = api.qsa[0].nome || '—';
    }
  }

  return {
    cnpj:         cnpj,
    razaoSocial:  razao,
    nomeFantasia: fantasia,
    nomeTitular:  titular,
    dataAbertura: abertura,
    cnae:         cnae,
    municipio:    municipio,
    situacao:     'Pendente de regularização'
  };
}


// ── Formulário de consulta (index.html) ──────

function iniciarFormulario() {
  var form = document.getElementById('consultaForm');
  if (!form) return;

  gerarCaptcha();

  document.getElementById('captcha-refresh') &&
    document.getElementById('captcha-refresh').addEventListener('click', gerarCaptcha);

  var inputCNPJ = document.getElementById('cnpj');
  if (inputCNPJ) {
    inputCNPJ.addEventListener('input', function () {
      this.value = aplicarMascaraCNPJ(this.value);
      this.classList.remove('is-invalid');
      var el = document.getElementById('cnpj-error');
      if (el) el.textContent = '';
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    submitConsulta();
  });
}

function submitConsulta() {
  var inputCNPJ = document.getElementById('cnpj');
  var cnpjError = document.getElementById('cnpj-error');

  inputCNPJ.classList.remove('is-invalid');
  if (cnpjError) cnpjError.textContent = '';

  var cnpj = inputCNPJ.value;

  if (!validarCNPJ(cnpj)) {
    mostrarErro(inputCNPJ, cnpjError, 'CNPJ inválido. Verifique os números digitados.');
    inputCNPJ.focus();
    return;
  }

  if (!validarCaptcha()) return;

  mostrarLoading(true);

  var cnpjLimpo = cnpj.replace(/\D/g, '');

  consultarCNPJ(cnpjLimpo)
    .then(function (resultado) {
      var dados = normalizarDados(resultado);
      localStorage.setItem('dadosCNPJ', JSON.stringify(dados));

      var vencimento = new Date();
      vencimento.setDate(vencimento.getDate() + 2);
      localStorage.setItem('dataVencimento', vencimento.toISOString());

      window.location.href = 'dados.html';
    })
    .catch(function (err) {
      mostrarLoading(false);

      // Exibe o erro abaixo do campo de CNPJ
      mostrarErro(inputCNPJ, cnpjError, err.message || 'Erro desconhecido. Tente novamente.');
      gerarCaptcha();
    });
}


// ── Preencher dados.html ─────────────────────

function iniciarDados() {
  if (!document.getElementById('dados-cnpj')) return;

  var dados     = JSON.parse(localStorage.getItem('dadosCNPJ') || 'null');
  var vencimento = localStorage.getItem('dataVencimento');

  // Sem dados? Redireciona para início
  if (!dados) {
    window.location.href = 'index.html';
    return;
  }

  function set(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val || '—';
  }

  set('dados-cnpj',      dados.cnpj);
  set('dados-razao',     dados.razaoSocial);
  set('dados-fantasia',  dados.nomeFantasia);
  set('dados-titular',   dados.nomeTitular);
  set('dados-abertura',  dados.dataAbertura);
  set('dados-cnae',      dados.cnae);
  set('dados-municipio', dados.municipio);

  var elVenc = document.getElementById('data-vencimento');
  if (elVenc && vencimento) {
    elVenc.textContent = formatarData(new Date(vencimento));
  }
}


// ── Copiar código PIX (pagamento.html) ───────

function copiarCodigo() {
  var el = document.getElementById('pixCode');
  if (!el) return;

  var texto    = el.textContent.trim();
  var feedback = document.getElementById('copyFeedback');

  function mostrar() {
    if (feedback) {
      feedback.style.display = 'block';
      setTimeout(function () { feedback.style.display = 'none'; }, 3000);
    }
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texto).then(mostrar).catch(function () { copiarFallback(texto, mostrar); });
  } else {
    copiarFallback(texto, mostrar);
  }
}

function copiarFallback(texto, cb) {
  var ta = document.createElement('textarea');
  ta.value = texto;
  ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); cb(); } catch (e) {}
  document.body.removeChild(ta);
}

window.copiarCodigo = copiarCodigo;


// ── Inicialização — detecção por elemento DOM ─

document.addEventListener('DOMContentLoaded', function () {

  if (document.getElementById('consultaForm')) {
    iniciarFormulario();
    return;
  }

  if (document.getElementById('dados-cnpj')) {
    iniciarDados();
    return;
  }

  if (document.getElementById('prazo-venc')) {
    var venc = localStorage.getItem('dataVencimento');
    var el   = document.getElementById('prazo-venc');
    if (el && venc) el.textContent = formatarData(new Date(venc));
    return;
  }

  // confirmacao.html: lógica inline no próprio HTML
});
