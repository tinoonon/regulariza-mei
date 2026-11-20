// =========================================
// EXEMPLO DE API BACKEND - NODE.JS/EXPRESS
// =========================================
// Este é um exemplo de como implementar o backend
// NÃO ESTÁ FUNCIONAL - É APENAS UM TEMPLATE

/*
INSTALAÇÃO:
npm init -y
npm install express cors body-parser axios dotenv

VARIÁVEIS DE AMBIENTE (.env):
RECAPTCHA_SECRET=sua_chave_secreta_recaptcha
PIX_API_KEY=sua_chave_gateway_pagamento
PORT=3000
*/

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Pasta com os arquivos HTML

// =========================================
// ENDPOINT 1: CONSULTAR CNPJ
// =========================================
app.post('/api/consultar-cnpj', async (req, res) => {
    try {
        const { cnpj, recaptchaToken } = req.body;

        // Validar reCAPTCHA
        const recaptchaResponse = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            null,
            {
                params: {
                    secret: process.env.RECAPTCHA_SECRET,
                    response: recaptchaToken
                }
            }
        );

        if (!recaptchaResponse.data.success) {
            return res.status(400).json({
                success: false,
                error: 'Validação reCAPTCHA falhou'
            });
        }

        // Validar CNPJ
        const cnpjLimpo = cnpj.replace(/\D/g, '');
        if (!validarCNPJ(cnpjLimpo)) {
            return res.status(400).json({
                success: false,
                error: 'CNPJ inválido'
            });
        }

        // Consultar CNPJ na ReceitaWS ou BrasilAPI
        const dadosCNPJ = await consultarCNPJReceitaWS(cnpjLimpo);

        // Verificar se está regularizado (lógica customizada)
        const situacao = verificarSituacao(dadosCNPJ);

        res.json({
            success: true,
            data: {
                cnpj: formatarCNPJ(cnpjLimpo),
                razao_social: dadosCNPJ.nome,
                nome_titular: dadosCNPJ.qsa?.[0]?.nome || 'Não informado',
                data_abertura: formatarData(dadosCNPJ.abertura),
                situacao: situacao
            }
        });

    } catch (error) {
        console.error('Erro ao consultar CNPJ:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao consultar CNPJ. Tente novamente.'
        });
    }
});

// =========================================
// ENDPOINT 2: GERAR PIX
// =========================================
app.post('/api/gerar-pix', async (req, res) => {
    try {
        const { cnpj, valor } = req.body;

        // Validar dados
        if (!cnpj || !valor) {
            return res.status(400).json({
                success: false,
                error: 'CNPJ e valor são obrigatórios'
            });
        }

        // Gerar PIX usando gateway de pagamento
        // Exemplo com Mercado Pago, PagSeguro, Asaas, etc
        const pixData = await gerarPixGateway(cnpj, valor);

        // Salvar no banco de dados
        const protocolo = gerarProtocolo();
        await salvarPagamentoDB({
            protocolo,
            cnpj,
            valor,
            status: 'pendente',
            qr_code: pixData.qr_code,
            expiracao: pixData.expiracao
        });

        res.json({
            success: true,
            data: {
                qr_code: pixData.qr_code,
                qr_code_image: pixData.qr_code_image,
                expiracao: pixData.expiracao,
                protocolo: protocolo
            }
        });

    } catch (error) {
        console.error('Erro ao gerar PIX:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao gerar PIX. Tente novamente.'
        });
    }
});

// =========================================
// ENDPOINT 3: VERIFICAR PAGAMENTO
// =========================================
app.get('/api/verificar-pagamento/:protocolo', async (req, res) => {
    try {
        const { protocolo } = req.params;

        // Buscar no banco de dados
        const pagamento = await buscarPagamentoDB(protocolo);

        if (!pagamento) {
            return res.status(404).json({
                success: false,
                error: 'Protocolo não encontrado'
            });
        }

        // Verificar status no gateway
        const status = await verificarStatusGateway(pagamento.id_gateway);

        // Atualizar banco se necessário
        if (status !== pagamento.status) {
            await atualizarStatusDB(protocolo, status);
        }

        res.json({
            success: true,
            data: {
                status: status,
                data_pagamento: pagamento.data_pagamento,
                comprovante_url: status === 'confirmado' 
                    ? `/comprovantes/${protocolo}.pdf` 
                    : null
            }
        });

    } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao verificar pagamento.'
        });
    }
});

// =========================================
// WEBHOOK: RECEBER NOTIFICAÇÕES DE PAGAMENTO
// =========================================
app.post('/api/webhook/pagamento', async (req, res) => {
    try {
        // Validar webhook (cada gateway tem sua forma)
        const isValid = validarWebhook(req);

        if (!isValid) {
            return res.status(401).json({ error: 'Webhook inválido' });
        }

        const { transaction_id, status } = req.body;

        // Buscar pagamento pelo ID da transação
        const pagamento = await buscarPagamentoPorTransacaoID(transaction_id);

        if (pagamento) {
            // Atualizar status
            await atualizarStatusDB(pagamento.protocolo, status);

            // Enviar email de confirmação
            if (status === 'confirmado') {
                await enviarEmailConfirmacao(pagamento);
            }
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Erro no webhook:', error);
        res.status(500).json({ error: 'Erro no webhook' });
    }
});

// =========================================
// FUNÇÕES AUXILIARES
// =========================================

// Validar CNPJ
function validarCNPJ(cnpj) {
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitos.charAt(0)) return false;

    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }

    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    return resultado == digitos.charAt(1);
}

// Consultar CNPJ na ReceitaWS
async function consultarCNPJReceitaWS(cnpj) {
    try {
        const response = await axios.get(`https://www.receitaws.com.br/v1/cnpj/${cnpj}`);
        return response.data;
    } catch (error) {
        throw new Error('Erro ao consultar CNPJ na ReceitaWS');
    }
}

// Verificar situação (customizar conforme regra de negócio)
function verificarSituacao(dadosCNPJ) {
    if (dadosCNPJ.situacao === 'ATIVA') {
        return 'Pendente de regularização';
    }
    return 'Irregular';
}

// Formatar CNPJ
function formatarCNPJ(cnpj) {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

// Formatar data
function formatarData(data) {
    const [dia, mes, ano] = data.split('/');
    return `${dia}/${mes}/${ano}`;
}

// Gerar protocolo único
function gerarProtocolo() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `MEI${timestamp}${random}`;
}

// Gerar PIX no gateway (exemplo genérico)
async function gerarPixGateway(cnpj, valor) {
    // IMPLEMENTAR: Integração com Mercado Pago, PagSeguro, Asaas, etc
    // Cada gateway tem sua própria API

    // Exemplo fictício
    return {
        qr_code: '00020126580014br.gov.bcb.pix...',
        qr_code_image: 'data:image/png;base64,...',
        expiracao: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    };
}

// Verificar status no gateway
async function verificarStatusGateway(idGateway) {
    // IMPLEMENTAR: Consultar status no gateway
    return 'pendente'; // ou 'confirmado', 'expirado'
}

// Validar webhook
function validarWebhook(req) {
    // IMPLEMENTAR: Validação específica do gateway
    return true;
}

// =========================================
// FUNÇÕES DE BANCO DE DADOS (EXEMPLO)
// =========================================
// Use PostgreSQL, MySQL, MongoDB, etc

async function salvarPagamentoDB(dados) {
    // IMPLEMENTAR: Salvar no banco
    console.log('Salvando pagamento:', dados);
}

async function buscarPagamentoDB(protocolo) {
    // IMPLEMENTAR: Buscar no banco
    return null;
}

async function buscarPagamentoPorTransacaoID(transactionId) {
    // IMPLEMENTAR: Buscar por ID da transação
    return null;
}

async function atualizarStatusDB(protocolo, status) {
    // IMPLEMENTAR: Atualizar status
    console.log(`Atualizando ${protocolo} para ${status}`);
}

async function enviarEmailConfirmacao(pagamento) {
    // IMPLEMENTAR: Enviar email usando Nodemailer, SendGrid, etc
    console.log('Enviando email para:', pagamento.email);
}

// =========================================
// INICIAR SERVIDOR
// =========================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📡 API disponível em http://localhost:${PORT}`);
});

// =========================================
// EXEMPLO DE USO NO FRONTEND
// =========================================
/*
// Consultar CNPJ
fetch('http://localhost:3000/api/consultar-cnpj', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        cnpj: '11.222.333/0001-81',
        recaptchaToken: 'token_do_recaptcha'
    })
})
.then(res => res.json())
.then(data => console.log(data));

// Gerar PIX
fetch('http://localhost:3000/api/gerar-pix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        cnpj: '11.222.333/0001-81',
        valor: 1.00
    })
})
.then(res => res.json())
.then(data => console.log(data));

// Verificar pagamento
fetch('http://localhost:3000/api/verificar-pagamento/MEI1234567890ABC')
.then(res => res.json())
.then(data => console.log(data));
*/
