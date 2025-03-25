require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');
const app = express();

// Middleware para parsear JSON no corpo das requisições
app.use(express.json());

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

// Lista de ferramentas disponíveis
const availableTools = [
  {
    name: 'list-calendars',
    description: 'List all available calendars',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get-calendar',
    description: 'Get details of a specific calendar',
    parameters: {
      type: 'object',
      properties: {
        calendarId: { type: 'string', description: 'ID of the calendar' }
      },
      required: ['calendarId']
    }
  },
  {
    name: 'list-events',
    description: 'List events from a calendar with filtering options',
    parameters: {
      type: 'object',
      properties: {
        calendarId: { type: 'string', description: 'ID of the calendar (default: primary)' },
        timeMin: { type: 'string', description: 'Start time for events (ISO format)' },
        timeMax: { type: 'string', description: 'End time for events (ISO format)' },
        maxResults: { type: 'number', description: 'Maximum number of events to return' }
      },
      required: []
    }
  },
  {
    name: 'get-event',
    description: 'Get detailed information about a specific event',
    parameters: {
      type: 'object',
      properties: {
        calendarId: { type: 'string', description: 'ID of the calendar (default: primary)' },
        eventId: { type: 'string', description: 'ID of the event' }
      },
      required: ['eventId']
    }
  },
  {
    name: 'create-event',
    description: 'Create a new calendar event',
    parameters: {
      type: 'object',
      properties: {
        calendarId: { type: 'string', description: 'ID of the calendar (default: primary)' },
        summary: { type: 'string', description: 'Title of the event' },
        start: { type: 'string', description: 'Start time of the event (ISO format)' },
        end: { type: 'string', description: 'End time of the event (ISO format)' }
      },
      required: ['summary', 'start', 'end']
    }
  },
  {
    name: 'update-event',
    description: 'Update an existing calendar event',
    parameters: {
      type: 'object',
      properties: {
        calendarId: { type: 'string', description: 'ID of the calendar (default: primary)' },
        eventId: { type: 'string', description: 'ID of the event' },
        summary: { type: 'string', description: 'Updated title of the event' },
        start: { type: 'string', description: 'Updated start time of the event (ISO format)' },
        end: { type: 'string', description: 'Updated end time of the event (ISO format)' }
      },
      required: ['eventId']
    }
  },
  {
    name: 'delete-event',
    description: 'Delete a calendar event',
    parameters: {
      type: 'object',
      properties: {
        calendarId: { type: 'string', description: 'ID of the calendar (default: primary)' },
        eventId: { type: 'string', description: 'ID of the event' }
      },
      required: ['eventId']
    }
  },
  {
    name: 'list-colors',
    description: 'List available colors for events and calendars',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

// Endpoint para listar ferramentas
app.get('/tools', (req, res) => {
  console.log('Recebida solicitação para /tools');
  res.json({ tools: availableTools });
});

// Endpoint para executar ferramentas
app.post('/execute-tool', (req, res) => {
  console.log('Recebida solicitação para /execute-tool');
  const { toolName, parameters } = req.body;

  if (!toolName || !availableTools.find(tool => tool.name === toolName)) {
    res.status(400).json({ error: `Ferramenta ${toolName} não encontrada` });
    return;
  }

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  switch (toolName) {
    case 'list-calendars':
      calendar.calendarList.list({}, (err, response) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(response.data.items);
      });
      break;
    case 'get-calendar':
      calendar.calendars.get({ calendarId: parameters.calendarId }, (err, response) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(response.data);
      });
      break;
    case 'list-events':
      calendar.events.list(
        {
          calendarId: parameters.calendarId || 'primary',
          timeMin: parameters.timeMin || '2025-01-01T00:00:00Z',
          timeMax: parameters.timeMax || '2025-12-31T23:59:59Z',
          maxResults: parameters.maxResults || 10,
          singleEvents: true,
          orderBy: 'startTime',
        },
        (err, response) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          const events = response.data.items.map(event => ({
            id: event.id,
            summary: event.summary,
            start: event.start.dateTime || event.start.date,
            end: event.end.dateTime || event.end.date,
          }));
          res.json(events);
        }
      );
      break;
    case 'get-event':
      calendar.events.get(
        {
          calendarId: parameters.calendarId || 'primary',
          eventId: parameters.eventId,
        },
        (err, response) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json(response.data);
        }
      );
      break;
    case 'create-event':
      calendar.events.insert(
        {
          calendarId: parameters.calendarId || 'primary',
          resource: {
            summary: parameters.summary,
            start: { dateTime: parameters.start },
            end: { dateTime: parameters.end },
          },
        },
        (err, response) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json(response.data);
        }
      );
      break;
    case 'update-event':
      calendar.events.update(
        {
          calendarId: parameters.calendarId || 'primary',
          eventId: parameters.eventId,
          resource: {
            summary: parameters.summary,
            start: parameters.start ? { dateTime: parameters.start } : undefined,
            end: parameters.end ? { dateTime: parameters.end } : undefined,
          },
        },
        (err, response) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json(response.data);
        }
      );
      break;
    case 'delete-event':
      calendar.events.delete(
        {
          calendarId: parameters.calendarId || 'primary',
          eventId: parameters.eventId,
        },
        (err) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json({ message: `Evento ${parameters.eventId} deletado com sucesso` });
        }
      );
      break;
    case 'list-colors':
      calendar.colors.get({}, (err, response) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(response.data);
      });
      break;
    default:
      res.status(400).json({ error: `Ferramenta ${toolName} não implementada` });
  }
});

// Endpoint SSE para listar eventos (mantido para compatibilidade)
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
      timeMin: '2025-01-01T00:00:00Z',
      timeMax: '2025-12-31T23:59:59Z',
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
    scope: ['https://www.googleapis.com/auth/calendar'],
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
