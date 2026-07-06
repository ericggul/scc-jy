#!/bin/bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")/.." && pwd)
CERT_DIR="$SCRIPT_DIR/certificates"

LOCAL_HOSTNAME=$(scutil --get LocalHostName 2>/dev/null || hostname -s)
CERT_HOSTNAME=${CERT_HOSTNAME:-"${LOCAL_HOSTNAME}.local"}
SHORT_HOSTNAME=${CERT_HOSTNAME%.local}

ROOT_KEY="$CERT_DIR/rootCA.key"
ROOT_CERT="$CERT_DIR/rootCA.pem"
SERVER_KEY="$CERT_DIR/server.key"
SERVER_CERT="$CERT_DIR/server.pem"
SERVER_CSR="$CERT_DIR/server.csr"
SERVER_CONF="$CERT_DIR/server.conf"
HOSTNAME_FILE="$CERT_DIR/.hostname"

mkdir -p "$CERT_DIR"

if [ ! -f "$ROOT_KEY" ]; then
  echo "Generating local Root CA private key..."
  openssl genrsa -out "$ROOT_KEY" 2048
fi

if [ ! -f "$ROOT_CERT" ]; then
  echo "Generating local Root CA certificate..."
  openssl req -x509 -new -nodes -key "$ROOT_KEY" -sha256 -days 3650 -out "$ROOT_CERT" \
    -subj "/C=KR/O=SCC-Dev/CN=SCC-Dev-Root-CA"
fi

NEEDS_REGEN=false

if [ ! -f "$SERVER_KEY" ] || [ ! -f "$SERVER_CERT" ]; then
  NEEDS_REGEN=true
fi

if [ -f "$HOSTNAME_FILE" ]; then
  STORED_HOSTNAME=$(cat "$HOSTNAME_FILE")
  if [ "$STORED_HOSTNAME" != "$CERT_HOSTNAME" ]; then
    NEEDS_REGEN=true
  fi
else
  NEEDS_REGEN=true
fi

if [ -f "$SERVER_CERT" ]; then
  if ! openssl x509 -checkend 86400 -noout -in "$SERVER_CERT" >/dev/null 2>&1; then
    NEEDS_REGEN=true
  fi
fi

if [ "$NEEDS_REGEN" = true ]; then
  echo "Generating HTTPS server certificate for ${CERT_HOSTNAME}..."

  cat > "$SERVER_CONF" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = req_ext

[dn]
C = KR
O = SCC-Dev
CN = $CERT_HOSTNAME

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = $CERT_HOSTNAME
IP.1 = 127.0.0.1
EOF

  if [ "$SHORT_HOSTNAME" != "$CERT_HOSTNAME" ]; then
    echo "DNS.3 = $SHORT_HOSTNAME" >> "$SERVER_CONF"
  fi

  openssl genrsa -out "$SERVER_KEY" 2048
  openssl req -new -key "$SERVER_KEY" -out "$SERVER_CSR" -config "$SERVER_CONF"
  openssl x509 -req -in "$SERVER_CSR" -CA "$ROOT_CERT" -CAkey "$ROOT_KEY" -CAcreateserial \
    -out "$SERVER_CERT" -days 825 -sha256 -extfile "$SERVER_CONF" -extensions req_ext

  echo "$CERT_HOSTNAME" > "$HOSTNAME_FILE"
fi

echo "HTTPS certificates ready for ${CERT_HOSTNAME}."
echo "NEXT_PUBLIC_DEV_HOSTNAME=${CERT_HOSTNAME}"
