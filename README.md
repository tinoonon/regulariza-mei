# Site de Regularização MEI

Site responsivo para regularização de MEI (Microempreendedor Individual) com sistema de consulta de CNPJ e pagamento via PIX.

## 📋 Páginas do Site

1. **index.html** - Página inicial com formulário de consulta de CNPJ
2. **dados.html** - Exibe informações do CNPJ e procedimento de regularização
3. **pagamento.html** - Página de pagamento via PIX com QR Code
4. **confirmacao.html** - Confirmação de pagamento e protocolo

## 🎨 Design

### Paleta de Cores
- **Azul Escuro:** #2c3e50 (cabeçalho e títulos)
- **Azul Claro:** #3498db (destaques e logo)
- **Laranja:** #f39c12 (badge MEI e alertas)
- **Verde:** #27ae60 (botões de ação)
- **Cinza Claro:** #f8f9fa (fundo)
- **Texto:** #34495e (cinza escuro)

## 🚀 Funcionalidades

### Página 1 - Consulta (index.html)
- ✅ Formulário de consulta CNPJ
- ✅ Máscara automática (00.000.000/0000-00)
- ✅ Validação de CNPJ (dígitos verificadores)
- ✅ reCAPTCHA integrado
- ✅ Loading ao consultar
- ✅ Tratamento de erros

### Página 2 - Dados (dados.html)
- ✅ Exibição dos dados do CNPJ
- ✅ Cálculo automático de vencimento (+2 dias)
- ✅ Procedimento de regularização em etapas
- ✅ Design responsivo

### Página 3 - Pagamento (pagamento.html)
- ✅ QR Code PIX gerado automaticamente
- ✅ Código PIX Copia e Cola
- ✅ Botão copiar com feedback visual
- ✅ Instruções passo a passo
- ✅ Timer de expiração

### Página 4 - Confirmação (confirmacao.html)
- ✅ Protocolo único gerado automaticamente
- ✅ Detalhes do pagamento
- ✅ Botão para baixar comprovante
- ✅ Informações de contato

## 📱 Responsividade

O site é totalmente responsivo e funciona perfeitamente em:
- Desktop (> 768px)
- Tablet (481px - 768px)
- Mobile (< 480px)

## 🔧 Tecnologias Utilizadas

- **HTML5** - Estrutura semântica
- **CSS3** - Estilização e responsividade
- **JavaScript (Vanilla)** - Funcionalidades e validações
- **QRCode.js** - Geração de QR Codes
- **Google reCAPTCHA** - Proteção contra bots

## 📦 Bibliotecas Externas

```html
<!-- QR Code Generator -->
<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>

<!-- Google reCAPTCHA -->
<script src="https://www.google.com/recaptcha/api.js"></script>
```

## 🔐 Segurança Implementada

- ✅ Validação de CNPJ no frontend
- ✅ reCAPTCHA v2 contra bots
- ✅ Sanitização de inputs
- ⚠️ **IMPORTANTE:** Em produção, implementar:
  - Rate limiting (máx 5 consultas por IP/hora)
  - Validação backend
  - HTTPS obrigatório
  - Token CSRF
  - Validação de CNPJ no backend

## 📝 Como Usar

### Modo Demonstração (Atual)

1. Abra `index.html` em um navegador
2. Digite qualquer CNPJ válido (ex: 11.222.333/0001-81)
3. Clique em "Não sou robô"
4. Clique em "Consultar CNPJ"
5. Navegue pelas páginas seguintes

**Observação:** Atualmente o site funciona em modo demonstração com dados fictícios salvos no localStorage do navegador.

### Integração com Backend

Para integrar com um backend real, você precisa:

1. **API de Consulta de CNPJ**
```javascript
// Em script.js, substituir a função processarConsulta()
fetch('/api/consultar-cnpj', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cnpj: cnpj })
})
.then(response => response.json())
.then(data => {
    // Processar resposta
});
```

2. **API de Geração de PIX**
```javascript
// Na página de pagamento
fetch('/api/gerar-pix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        cnpj: cnpj,
        valor: 0.50 
    })
})
.then(response => response.json())
.then(data => {
    // Gerar QR Code com data.qr_code
});
```

3. **API de Verificação de Pagamento**
```javascript
// Polling ou webhook
fetch(`/api/verificar-pagamento/${protocolo}`)
.then(response => response.json())
.then(data => {
    // Atualizar status
});
```

## 🔗 APIs Sugeridas

### Consulta de CNPJ
- [ReceitaWS](https://receitaws.com.br/api) - Gratuita (limite de requisições)
- [BrasilAPI](https://brasilapi.com.br/) - Gratuita e open source

### Gateway de Pagamento PIX
- [Mercado Pago](https://www.mercadopago.com.br/developers)
- [PagSeguro](https://dev.pagseguro.uol.com.br/)
- [Asaas](https://docs.asaas.com/)
- [Stripe](https://stripe.com/br)

## 📂 Estrutura de Arquivos

```
assessoria-mei/
├── index.html          # Página de consulta
├── dados.html          # Página de informações
├── pagamento.html      # Página de pagamento PIX
├── confirmacao.html    # Página de confirmação
├── style.css           # Estilos globais
├── script.js           # JavaScript global
└── README.md           # Esta documentação
```

## 🎯 Próximos Passos

### Para Produção:

1. **Backend API**
   - [ ] Criar endpoints REST
   - [ ] Integrar com ReceitaWS ou BrasilAPI
   - [ ] Integrar com gateway de pagamento
   - [ ] Implementar banco de dados
   - [ ] Sistema de autenticação

2. **Segurança**
   - [ ] Implementar rate limiting
   - [ ] Adicionar CSRF tokens
   - [ ] Configurar HTTPS
   - [ ] Validação server-side
   - [ ] Sanitização de dados

3. **Funcionalidades**
   - [ ] Sistema de notificações (email/SMS)
   - [ ] Painel administrativo
   - [ ] Histórico de consultas
   - [ ] Sistema de logs
   - [ ] Webhooks para pagamentos

4. **Melhorias**
   - [ ] PWA (Progressive Web App)
   - [ ] Dark mode
   - [ ] Multi-idiomas
   - [ ] Analytics integrado
   - [ ] Chat de suporte

## 📧 Contato

Para personalizar as informações de contato, edite:

```javascript
// No footer de cada página HTML
<p>Atendimento: SEU_EMAIL@exemplo.com.br</p>

// Na página de confirmação
<p>📧 SEU_EMAIL@exemplo.com.br</p>
<p>📱 WhatsApp: (XX) XXXXX-XXXX</p>
```

## 📄 Licença

Este é um projeto de demonstração. Adapte conforme necessário para seu uso.

## ⚠️ Avisos Importantes

1. **Dados Fictícios:** O site atualmente usa dados fictícios para demonstração
2. **reCAPTCHA:** Configure sua própria chave em produção
3. **Validação:** Implemente validação backend antes de usar em produção
4. **Compliance:** Verifique conformidade com LGPD para armazenamento de dados
5. **Gateway:** Escolha e configure um gateway de pagamento oficial

## 🐛 Solução de Problemas

### QR Code não aparece
- Verifique se a biblioteca QRCode.js está carregando
- Abra o console do navegador (F12) e verifique erros

### Código PIX não copia
- Verifique permissões do navegador para clipboard
- Teste em modo HTTPS (necessário para clipboard API)

### Máscara de CNPJ não funciona
- Verifique se o JavaScript está carregando
- Confirme que o ID do input está correto (#cnpj)

---

**Desenvolvido para regularização de MEI** 🚀
