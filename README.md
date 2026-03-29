# 🤖 CatálogoBot

Bot de catálogo automático para WhatsApp — responde clientes com fotos dos produtos 24h por dia.

---

## 🚀 Deploy no Railway

### 1. Subir para o GitHub

```bash
git init
git add .
git commit -m "feat: catalogobot inicial"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/catalogobot.git
git push -u origin main
```

### 2. Criar projeto no Railway

1. Acesse railway.app e clique em **New Project**
2. Escolha **Deploy from GitHub repo**
3. Selecione o repositório `catalogobot`
4. O Railway detecta automaticamente o Node.js e faz o build

### 3. Configurar variáveis de ambiente no Railway

Vá em **Variables** e adicione:

| Variável | Valor |
|---|---|
| `WHATSAPP_TOKEN` | Token do seu app Meta |
| `PHONE_NUMBER_ID` | ID do número de telefone |
| `VERIFY_TOKEN` | Palavra secreta do webhook |
| `BASE_URL` | URL gerada pelo Railway (ex: https://catalogobot-production.up.railway.app) |

⚠️ NÃO adicione PORT — o Railway injeta automaticamente.

### 4. Configurar o Webhook na Meta

1. No painel do Meta for Developers, vá em WhatsApp > Configuração
2. URL do webhook: https://SEU-DOMINIO.up.railway.app/webhook
3. Token de verificação: mesmo valor do VERIFY_TOKEN
4. Assine o evento: messages

---

## 📦 Estrutura

```
catalogobot/
├── src/
│   ├── server.js      # Servidor Express + rotas
│   ├── database.js    # Banco de dados JSON local
│   └── whatsapp.js    # Integração WhatsApp API
├── public/
│   └── index.html     # Painel de administração
├── railway.toml       # Configuração do Railway
├── nixpacks.toml      # Configuração de build
├── Procfile           # Comando de start (fallback)
└── .env.example       # Variáveis necessárias
```

## 🔧 Rodar localmente

```bash
cp .env.example .env
# Preencha o .env com seus dados reais
npm install
npm run dev
```

Acesse: http://localhost:3000
