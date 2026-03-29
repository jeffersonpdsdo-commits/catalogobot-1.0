const https = require('https');

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.PHONE_NUMBER_ID;
const API_URL = `https://graph.facebook.com/v19.0/${PHONE_ID}/messages`;

// Faz requisição para a API do WhatsApp
function chamarAPI(body) {
  return new Promise((resolve, reject) => {
    const dados = JSON.stringify(body);
    const url = new URL(API_URL);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dados)
      }
    };

    const req = https.request(options, (res) => {
      let resposta = '';
      res.on('data', chunk => resposta += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(resposta);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            console.error('Erro WhatsApp API:', json);
            reject(new Error(json.error?.message || 'Erro na API do WhatsApp'));
          }
        } catch {
          reject(new Error('Resposta inválida da API'));
        }
      });
    });

    req.on('error', reject);
    req.write(dados);
    req.end();
  });
}

// Envia mensagem de texto
async function enviarTexto(para, texto) {
  if (!TOKEN || !PHONE_ID) {
    console.log(`[MODO TESTE] Para ${para}: ${texto}`);
    return;
  }

  return chamarAPI({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: para,
    type: 'text',
    text: { body: texto }
  });
}

// Envia foto com legenda
async function enviarFoto(para, urlFoto, legenda) {
  if (!TOKEN || !PHONE_ID) {
    console.log(`[MODO TESTE] Foto para ${para}: ${urlFoto} | Legenda: ${legenda}`);
    return;
  }

  return chamarAPI({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: para,
    type: 'image',
    image: {
      link: urlFoto,
      caption: legenda
    }
  });
}

// Envia lista de botões (opcional — para menu de categorias)
async function enviarBotoes(para, titulo, corpo, botoes) {
  if (!TOKEN || !PHONE_ID) {
    console.log(`[MODO TESTE] Botões para ${para}: ${titulo}`);
    return;
  }

  return chamarAPI({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: para,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: { type: 'text', text: titulo },
      body: { text: corpo },
      action: {
        buttons: botoes.map((b, i) => ({
          type: 'reply',
          reply: { id: `btn_${i}`, title: b }
        }))
      }
    }
  });
}

module.exports = { enviarTexto, enviarFoto, enviarBotoes };
