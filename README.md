# MCP Calendar Server

Este projeto implementa um servidor MCP que integra o Google Calendar com o n8n usando Server-Sent Events (SSE).

## Pré-requisitos
- Node.js 18+
- Conta no Google Cloud Console com a API do Google Calendar habilitada
- Easypanel (ou outro ambiente Docker) para hospedagem
- n8n com o pacote `n8n-nodes-mcp` instalado

## Configuração no Google Cloud Console
1. Crie um projeto no [Google Cloud Console](https://console.cloud.google.com/).
2. Habilite a API do Google Calendar:
   - Vá para "APIs & Services" > "Library".
   - Procure por "Google Calendar API" e clique em "Enable".
3. Crie um cliente OAuth 2.0:
   - Vá para "APIs & Services" > "Credentials".
   - Clique em "Create Credentials" > "OAuth 2.0 Client IDs".
   - Selecione "Web application".
   - Adicione o `redirect_uri` (ex.: `https://sua-url/auth/callback`) em "Authorized redirect URIs".
   - Copie o `Client ID` e `Client Secret`.

## Instalação no Easypanel
1. Clone o repositório:
   ```bash
   git clone https://github.com/2BX-git/mcp-calendar-server.git
   cd mcp-calendar-server
