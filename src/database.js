const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/produtos.json');

// Garante que o diretório de dados existe
function garantirDiretorio() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Lê o banco de dados
function ler() {
  garantirDiretorio();
  if (!fs.existsSync(DB_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return [];
  }
}

// Salva o banco de dados
function salvar(dados) {
  garantirDiretorio();
  fs.writeFileSync(DB_PATH, JSON.stringify(dados, null, 2), 'utf8');
}

// Gera ID único
function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── OPERAÇÕES ───────────────────────────────────────────────────────

function listarProdutos() {
  return ler();
}

function buscarProdutoPorId(id) {
  return ler().find(p => p.id === id) || null;
}

function criarProduto({ nome, preco, descricao, palavrasChave, fotos }) {
  const produtos = ler();
  const novo = {
    id: gerarId(),
    nome,
    preco: preco || '',
    descricao: descricao || '',
    palavrasChave: palavrasChave || [],
    fotos: fotos || [],
    criadoEm: new Date().toISOString()
  };
  produtos.push(novo);
  salvar(produtos);
  return novo;
}

function atualizarProduto(id, { nome, preco, descricao, palavrasChave, novasFotos }) {
  const produtos = ler();
  const idx = produtos.findIndex(p => p.id === id);
  if (idx === -1) return null;

  const p = produtos[idx];
  if (nome !== undefined) p.nome = nome;
  if (preco !== undefined) p.preco = preco;
  if (descricao !== undefined) p.descricao = descricao;
  if (palavrasChave !== undefined) p.palavrasChave = palavrasChave;
  if (novasFotos) p.fotos = [...p.fotos, ...novasFotos];
  p.atualizadoEm = new Date().toISOString();

  salvar(produtos);
  return p;
}

function excluirProduto(id) {
  const produtos = ler();
  const idx = produtos.findIndex(p => p.id === id);
  if (idx === -1) return false;
  produtos.splice(idx, 1);
  salvar(produtos);
  return true;
}

// Busca produto por palavra-chave (coração do bot)
function buscarPorPalavraChave(texto) {
  const produtos = ler();
  const palavras = texto.toLowerCase().split(/\s+/);

  // Busca exata primeiro
  for (const p of produtos) {
    for (const kw of p.palavrasChave) {
      if (texto.includes(kw)) return p;
    }
  }

  // Busca parcial (cada palavra do texto contra cada palavra-chave)
  for (const p of produtos) {
    for (const kw of p.palavrasChave) {
      for (const palavra of palavras) {
        if (palavra.length >= 3 && kw.includes(palavra)) return p;
      }
    }
  }

  return null;
}

module.exports = {
  listarProdutos,
  buscarProdutoPorId,
  criarProduto,
  atualizarProduto,
  excluirProduto,
  buscarPorPalavraChave
};
