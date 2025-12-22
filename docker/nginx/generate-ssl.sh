#!/bin/bash
# Jarvis IHM - Génération de certificats SSL auto-signés

SSL_DIR="$(dirname "$0")/ssl"
mkdir -p "$SSL_DIR"

echo "Generating self-signed SSL certificate for Jarvis IHM..."

# Générer la clé privée et le certificat
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$SSL_DIR/jarvis.key" \
    -out "$SSL_DIR/jarvis.crt" \
    -subj "/C=FR/ST=IDF/L=Paris/O=Jarvis/OU=IHM/CN=jarvis.local" \
    -addext "subjectAltName=DNS:jarvis.local,DNS:localhost,IP:127.0.0.1"

# Définir les permissions
chmod 600 "$SSL_DIR/jarvis.key"
chmod 644 "$SSL_DIR/jarvis.crt"

echo "SSL certificate generated successfully!"
echo "  - Certificate: $SSL_DIR/jarvis.crt"
echo "  - Private key: $SSL_DIR/jarvis.key"
echo ""
echo "Note: This is a self-signed certificate."
echo "Your browser will show a security warning - this is expected."
