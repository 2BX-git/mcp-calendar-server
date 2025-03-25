require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');
const app = express();

// Configurações básicas
const port = process.env.PORT || 3001;
const baseUrl = process.env.BASE_URL || `https://calendar.2bx.com.br`;
const redirectUri = `${baseUrl}/auth/callback`;

// Depura as variáveis de ambiente no início
console.log('BASE_URL:', baseUrl);
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET);
console.log('GOOGLE_REDIRECT_URI:', redirectUri);
console.log('PORT:', port);
console.log('GOOGLE_REFRESH_TOKEN:', process.env.GOOGLE_REFRESH_TOKEN);

// Configuração do Google OAuth2
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  redirectUri
);

// Endpoint SSE para MCP
app.get('/sse', (req, res) => {
  console.log('Recebida solicitação para /sse');

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (data) => {
    console.log('Enviando evento:', data);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  console.log('Listando eventos do Google Calendar...');
  calendar.events.list(
    {
      calendarId: 'primary',
      timeMin: '2025-01-01T00:00:00Z', // Busca eventos a partir de 1 de janeiro de 2025
      timeMax: '2025-12-31T23:59:59Z', // Até o final de 2025
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    },
    (err, response) => {
      if (err) {
        console.error('Erro ao listar eventos:', err.message);
        sendEvent({ error: err.message });
        return;
      }
      console.log('Eventos recebidos do Google Calendar:', response.data.items);
      const events = response.data.items.map(event => ({
        id: event.id,
        summary: event.summary,
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
      }));
      sendEvent({ events });
    }
  );

  // Envia um evento de keep-alive a cada 15 segundos
  const keepAliveInterval = setInterval(() => {
    console.log('Enviando keep-alive');
    res.write(`data: {"keepAlive": true}\n\n`);
  }, 15000);

  req.on('close', () => {
    console.log('Conexão SSE fechada pelo cliente');
    clearInterval(keepAliveInterval);
    res.end();
  });
});

// Endpoint para autenticação
app.get('/auth', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
  });
  res.redirect(url);
});

// Endpoint de callback que salva o code
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  // Salva o code em um arquivo temporário
  fs.writeFileSync('/tmp/auth_code', code);
  res.send('Código de autorização obtido! Você pode fechar esta janela.');
});

app.listen(port, () => {
  console.log(`Servidor MCP rodando na porta ${port}`);
});
