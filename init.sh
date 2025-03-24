#!/bin/bash

# Função para depurar variáveis de ambiente
debug_env() {
  echo "Depurando variáveis de ambiente..."
  echo "BASE_URL: $BASE_URL"
  echo "GOOGLE_CLIENT_ID: $GOOGLE_CLIENT_ID"
  echo "GOOGLE_CLIENT_SECRET: $GOOGLE_CLIENT_SECRET"
  echo "GOOGLE_REDIRECT_URI: $GOOGLE_REDIRECT_URI"
  echo "PORT: $PORT"
}

# Função para obter o code
get_auth_code() {
  echo "Iniciando o servidor temporariamente para obter o código de autorização..."
  npm start &
  SERVER_PID=$!

  # Espera o servidor iniciar
  sleep 5

  # Exibe o URL de autenticação para o usuário
  AUTH_URL="${BASE_URL}/auth"
  echo "Por favor, acesse o seguinte URL no seu navegador para autorizar o acesso:"
  echo "$AUTH_URL"

  # Espera o code ser salvo em /tmp/auth_code
  echo "Aguardando o código de autorização..."
  while [ ! -f /tmp/auth_code ]; do
    sleep 5
  done

  # Lê o code
  GOOGLE_AUTH_CODE=$(cat /tmp/auth_code)
  echo "Código de autorização obtido: $GOOGLE_AUTH_CODE"

  # Para o servidor temporário
  kill $SERVER_PID
  wait $SERVER_PID 2>/dev/null
}

# Função para obter o refresh_token
get_refresh_token() {
  echo "Trocando o código de autorização por um refresh_token..."
  RESPONSE=$(curl -s -X POST https://oauth2.googleapis.com/token \
    -d "code=$GOOGLE_AUTH_CODE" \
    -d "client_id=$GOOGLE_CLIENT_ID" \
    -d "client_secret=$GOOGLE_CLIENT_SECRET" \
    -d "redirect_uri=$GOOGLE_REDIRECT_URI" \
    -d "grant_type=authorization_code")

  # Extrai o refresh_token da resposta JSON
  REFRESH_TOKEN=$(echo $RESPONSE | grep -o '"refresh_token":"[^"]*' | sed 's/"refresh_token":"//')

  if [ -z "$REFRESH_TOKEN" ]; then
    echo "Erro ao obter o refresh_token. Resposta do Google: $RESPONSE"
    exit 1
  fi

  echo "Refresh token obtido: $REFRESH_TOKEN"

  # Salva o refresh_token em um arquivo temporário
  echo "GOOGLE_REFRESH_TOKEN=$REFRESH_TOKEN" > /tmp/refresh_token
}

# Início do script
echo "Iniciando o processo de inicialização..."

# Depura as variáveis de ambiente
debug_env

# Verifica se o GOOGLE_REFRESH_TOKEN já existe
if [ -n "$GOOGLE_REFRESH_TOKEN" ]; then
  echo "Refresh token já existe: $GOOGLE_REFRESH_TOKEN"
  npm start
  exit 0
fi

# Verifica se as variáveis obrigatórias estão definidas
if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ] || [ -z "$BASE_URL" ]; then
  echo "Erro: Variáveis GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET ou BASE_URL não estão definidas."
  exit 1
fi

# Define o GOOGLE_REDIRECT_URI com base na BASE_URL, se não estiver definido
if [ -z "$GOOGLE_REDIRECT_URI" ]; then
  GOOGLE_REDIRECT_URI="${BASE_URL}/auth/callback"
  export GOOGLE_REDIRECT_URI
fi

# Obtém o code
get_auth_code

# Obtém o refresh_token
get_refresh_token

# Atualiza a variável GOOGLE_REFRESH_TOKEN no ambiente atual
export GOOGLE_REFRESH_TOKEN=$(cat /tmp/refresh_token | grep -o 'GOOGLE_REFRESH_TOKEN=.*' | cut -d'=' -f2)

# Inicia o servidor
npm start
