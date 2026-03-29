const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const whatsapp = require('./whatsapp');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../public')));

// Upload de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB por foto
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Apenas imagens JPG, PNG ou WEBP.'), ok);
  }
});

// ─── ROTAS DE PRODUTOS ────────────────────────────────────────────────

// Listar todos os produtos
app.get('/api/produtos', (req, res) => {
  const produtos = db.listarProdutos();
  res.json({ sucesso: true, produtos });
});

// Buscar produto por ID
app.get('/api/produtos/:id', (req, res) => {
  const produto = db.buscarProdutoPorId(req.params.id);
  if (!produto) return res.status(404).json({ sucesso: false, erro: 'Produto não encontrado.' });
  res.json({ sucesso: true, produto });
});

// Criar produto com fotos
app.post('/api/produtos', upload.array('fotos', 5), (req, res) => {
  try {
    const { nome, preco, descricao, palavrasChave } = req.body;

    if (!nome) return res.status(400).json({ sucesso: false, erro: 'Nome é obrigatório.' });

    const kws = palavrasChave
      ? palavrasChave.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
      : [];

    if (kws.length === 0)
      return res.status(400).json({ sucesso: false, erro: 'Informe pelo menos uma palavra-chave.' });

    const fotos = (req.files || []).map(f => `/uploads/${f.filename}`);

    const produto = db.criarProduto({ nome, preco, descricao, palavrasChave: kws, fotos });
    res.status(201).json({ sucesso: true, produto });
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

// Editar produto
app.put('/api/produtos/:id', upload.array('fotos', 5), (req, res) => {
  try {
    const { nome, preco, descricao, palavrasChave } = req.body;
    const kws = palavrasChave
      ? palavrasChave.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
      : undefined;

    const novasFotos = (req.files || []).map(f => `/uploads/${f.filename}`);

    const produto = db.atualizarProduto(req.params.id, {
      nome, preco, descricao,
      palavrasChave: kws,
      novasFotos: novasFotos.length > 0 ? novasFotos : undefined
    });

    if (!produto) return res.status(404).json({ sucesso: false, erro: 'Produto não encontrado.' });
    res.json({ sucesso: true, produto });
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

// Excluir produto
app.delete('/api/produtos/:id', (req, res) => {
  const ok = db.excluirProduto(req.params.id);
  if (!ok) return res.status(404).json({ sucesso: false, erro: 'Produto não encontrado.' });
  res.json({ sucesso: true, mensagem: 'Produto excluído.' });
});

// ─── WEBHOOK WHATSAPP ────────────────────────────────────────────────

// Verificação do webhook pela Meta
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
console.log(`🔍 Webhook check — mode: ${mode}, token recebido: ${token}, token esperado: ${process.env.VERIFY_TOKEN}`);
  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('✅ Webhook verificado pela Meta!');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Receber mensagens dos clientes
app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // responde 200 imediatamente para a Meta

  try {
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages) return;

    const msg = value.messages[0];
    const de = msg.from; // número do cliente

    // Só processa mensagens de texto
    if (msg.type !== 'text') {
      await whatsapp.enviarTexto(
        de,
        'Oi! 👋 Me manda uma palavra-chave do que você procura (ex: tênis, camiseta, bolsa) que eu te mostro o produto!'
      );
      return;
    }

    const texto = msg.text.body.toLowerCase().trim();
    console.log(`📩 Mensagem de ${de}: "${texto}"`);

    // Busca produto pela palavra-chave
    const produto = db.buscarPorPalavraChave(texto);

    if (produto) {
      console.log(`✅ Produto encontrado: ${produto.nome}`);

      // Envia mensagem de intro
      await whatsapp.enviarTexto(de, `Encontrei! Olha só 👇`);

      // Envia cada foto do produto
      if (produto.fotos && produto.fotos.length > 0) {
        const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
        for (const foto of produto.fotos) {
          const legenda = `*${produto.nome}*\n💰 ${produto.preco || 'Consulte o preço'}\n📋 ${produto.descricao || ''}`;
          await whatsapp.enviarFoto(de, baseUrl + foto, legenda);
        }
      } else {
        // Sem foto — envia só texto com detalhes
        await whatsapp.enviarTexto(
          de,
          `*${produto.nome}*\n💰 ${produto.preco || 'Consulte o preço'}\n📋 ${produto.descricao || ''}`
        );
      }

      // Mensagem de fechamento
      await whatsapp.enviarTexto(
        de,
        `Ficou interessado? Pode me chamar aqui mesmo para fechar o pedido! 😊`
      );
    } else {
      // Palavra-chave não encontrada
      await whatsapp.enviarTexto(
        de,
        `Hmm, não encontrei esse produto no catálogo 🤔\n\nPode descrever melhor? Me diga o *nome*, *cor* ou *tipo* do que você procura.`
      );
    }
  } catch (err) {
    console.error('Erro ao processar mensagem:', err.message);
  }
});

// ─── ROTA DE STATUS ──────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  const produtos = db.listarProdutos();
  const totalKws = produtos.reduce((acc, p) => acc + p.palavrasChave.length, 0);
  const totalFotos = produtos.reduce((acc, p) => acc + p.fotos.length, 0);
  res.json({
    status: 'online',
    produtos: produtos.length,
    palavrasChave: totalKws,
    fotos: totalFotos,
    whatsappConfigurado: !!(process.env.WHATSAPP_TOKEN && process.env.PHONE_NUMBER_ID)
  });
});

app.listen(PORT, () => {
  console.log(`\n🤖 CatálogoBot rodando na porta ${PORT}`);
  console.log(`📦 Painel: http://localhost:${PORT}`);
  console.log(`🔗 Webhook: http://localhost:${PORT}/webhook\n`);
});
