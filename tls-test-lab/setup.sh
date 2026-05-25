#!/usr/bin/env bash
# =============================================================================
# TLS Certificate Test Lab — Setup Script
# EC2 (Ubuntu 22.04 / Amazon Linux 2023) + Nginx multi-port
#
# Creates 9 virtual hosts each demonstrating a different TLS certificate error.
# Mimics property of *.shongco.net cert signed by Fake DigiCert CA.
#
# Usage:  sudo ./setup.sh
# =============================================================================

set -euo pipefail

# ─── CONFIG ──────────────────────────────────────────────────────────────────
BASE_DIR="/etc/tls-lab"
CA_DIR="$BASE_DIR/ca"
CERTS_DIR="$BASE_DIR/certs"

DOMAIN="shongco.net"
WILDCARD="*.shongco.net"
ORG="Ngern Tid Lor Public Company Limited"
CITY="Phaya Thai"
STATE="Bangkok"
COUNTRY="TH"

FAKE_ROOT_CN="DigiCert Global Root G2"
FAKE_INT_CN="DigiCert Global G2 TLS RSA SHA256 2020 CA1"

MAIN_SUBJ="/C=${COUNTRY}/ST=${STATE}/L=${CITY}/O=${ORG}/CN=${WILDCARD}"

# ─── COLORS / LOG ────────────────────────────────────────────────────────────
BOLD=$'\033[1m'
RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'
BLUE=$'\033[0;34m'; CYAN=$'\033[0;36m'; NC=$'\033[0m'

step() { printf "\n${BOLD}${BLUE}══ STEP %s: %s ══${NC}\n" "$1" "$2"; }
ok()   { printf "  ${GREEN}✓${NC} %s\n" "$1"; }
warn() { printf "  ${YELLOW}⚠${NC}  %s\n" "$1"; }
die()  { printf "\n${RED}✗ ERROR: %s${NC}\n" "$1" >&2; exit 1; }

# ─── PRE-CHECK ───────────────────────────────────────────────────────────────
[[ $EUID -eq 0 ]] || die "Must run as root:  sudo $0"

command -v openssl &>/dev/null || die "openssl not found — install it first."

# ─── STEP 1: INSTALL NGINX ───────────────────────────────────────────────────
step 1 "Install dependencies"

if command -v apt-get &>/dev/null; then
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y nginx openssl >/dev/null
    NGINX_SITES_AVAIL="/etc/nginx/sites-available"
    NGINX_SITES_EN="/etc/nginx/sites-enabled"
    ok "Installed via apt (nginx, openssl)"
elif command -v dnf &>/dev/null; then
    dnf install -y nginx openssl >/dev/null
    NGINX_SITES_AVAIL="/etc/nginx/conf.d"
    NGINX_SITES_EN=""
    ok "Installed via dnf (nginx, openssl)"
elif command -v yum &>/dev/null; then
    yum install -y nginx openssl >/dev/null
    NGINX_SITES_AVAIL="/etc/nginx/conf.d"
    NGINX_SITES_EN=""
    ok "Installed via yum (nginx, openssl)"
else
    die "Unsupported package manager. Install nginx and openssl manually."
fi

# ─── STEP 2: CREATE DIRECTORY STRUCTURE ──────────────────────────────────────
step 2 "Create directory structure"

CASES=(valid expired not-yet-valid wrong-hostname self-signed untrusted-ca weak-key wrong-ku wildcard-mismatch)

mkdir -p "$CA_DIR"
chmod 700 "$CA_DIR"
for c in "${CASES[@]}"; do
    mkdir -p "$CERTS_DIR/$c"
done
ok "Created $BASE_DIR/{ca, certs/{$(IFS=,; echo "${CASES[*]}")}}"

# ─── STEP 3: GENERATE FAKE CA ────────────────────────────────────────────────
step 3 "Generate Fake CA (mimicking DigiCert chain)"

# Root CA
openssl genrsa -out "$CA_DIR/root-ca.key" 4096 2>/dev/null
openssl req -x509 -new -nodes \
    -key "$CA_DIR/root-ca.key" \
    -sha256 -days 7300 \
    -subj "/C=US/O=DigiCert Inc/OU=www.digicert.com/CN=${FAKE_ROOT_CN}" \
    -out "$CA_DIR/root-ca.crt" 2>/dev/null
ok "Root CA:         CN=${FAKE_ROOT_CN}"

# Intermediate CA
openssl genrsa -out "$CA_DIR/intermediate.key" 2048 2>/dev/null
openssl req -new \
    -key "$CA_DIR/intermediate.key" \
    -subj "/C=US/O=DigiCert Inc/CN=${FAKE_INT_CN}" \
    -out "$CA_DIR/intermediate.csr" 2>/dev/null

cat > /tmp/tls-lab-ca-ext.cnf << 'EXTEOF'
[v3_ca]
basicConstraints=critical,CA:TRUE,pathlen:0
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid:always,issuer
keyUsage=critical,digitalSignature,cRLSign,keyCertSign
EXTEOF

openssl x509 -req \
    -in "$CA_DIR/intermediate.csr" \
    -CA "$CA_DIR/root-ca.crt" \
    -CAkey "$CA_DIR/root-ca.key" \
    -CAcreateserial \
    -days 7300 -sha256 \
    -extfile /tmp/tls-lab-ca-ext.cnf \
    -extensions v3_ca \
    -out "$CA_DIR/intermediate.crt" 2>/dev/null

# Full trust chain for clients
cat "$CA_DIR/intermediate.crt" "$CA_DIR/root-ca.crt" > "$CA_DIR/ca-chain.crt"
ok "Intermediate CA: CN=${FAKE_INT_CN}"

# Rogue CA (port 4435 — untrusted)
openssl genrsa -out "$CA_DIR/rogue-ca.key" 2048 2>/dev/null
openssl req -x509 -new -nodes \
    -key "$CA_DIR/rogue-ca.key" \
    -sha256 -days 3650 \
    -subj "/C=RU/O=Rogue Certificate Authority/CN=Rogue CA" \
    -out "$CA_DIR/rogue-ca.crt" 2>/dev/null
ok "Rogue CA:        CN=Rogue CA (not in any trust store)"

chmod 400 "$CA_DIR"/*.key

# ─── STEP 4: GENERATE 9 TEST CERTIFICATES ────────────────────────────────────
step 4 "Generate 9 test certificates"

# ── Helper: write standard extension config ───────────────────────────────────
# Args: [san] [keyUsage] [extendedKeyUsage]
write_ext() {
    local san="${1:-DNS:*.shongco.net,DNS:shongco.net}"
    local ku="${2:-digitalSignature,keyEncipherment}"
    local eku="${3:-serverAuth,clientAuth}"
    cat << EXTEOF
[ext]
subjectAltName=$san
keyUsage=critical,$ku
extendedKeyUsage=$eku
basicConstraints=CA:FALSE
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid,issuer
EXTEOF
}

# ── Helper: sign CSR with given CA; extra args forwarded to openssl x509 ──────
# Args: dir ca_crt ca_key [openssl-x509-flags...]
sign_with() {
    local dir="$1" ca_crt="$2" ca_key="$3"; shift 3
    openssl x509 -req \
        -in "$dir/server.csr" \
        -CA "$ca_crt" -CAkey "$ca_key" \
        -CAcreateserial \
        -sha256 \
        -extfile "$dir/ext.cnf" -extensions ext \
        "$@" \
        -out "$dir/server.crt" 2>/dev/null
}

# ── Helper: build fullchain (cert + CA files) ─────────────────────────────────
mk_chain() {
    local dir="$1"; shift
    cat "$dir/server.crt" "$@" > "$dir/fullchain.pem"
}

# ─────────────────────────────────────────────────────────────────────────────
# PORT 443 — Valid certificate
# Matches *.shongco.net, RSA 2048, SHA256, correct EKU, signed by Fake DigiCert
# ─────────────────────────────────────────────────────────────────────────────
D="$CERTS_DIR/valid"
openssl genrsa -out "$D/server.key" 2048 2>/dev/null
openssl req -new -key "$D/server.key" -subj "$MAIN_SUBJ" -out "$D/server.csr" 2>/dev/null
write_ext > "$D/ext.cnf"
sign_with "$D" "$CA_DIR/intermediate.crt" "$CA_DIR/intermediate.key" -days 365
mk_chain  "$D" "$CA_DIR/ca-chain.crt"
ok "443   Valid cert → $WILDCARD  (Fake DigiCert chain, RSA 2048, 1 year)"

# ─────────────────────────────────────────────────────────────────────────────
# PORT 4431 — Expired certificate
# notBefore=2022-12-01  notAfter=2023-12-01
# ─────────────────────────────────────────────────────────────────────────────
D="$CERTS_DIR/expired"
openssl genrsa -out "$D/server.key" 2048 2>/dev/null
openssl req -new -key "$D/server.key" -subj "$MAIN_SUBJ" -out "$D/server.csr" 2>/dev/null
write_ext > "$D/ext.cnf"
sign_with "$D" "$CA_DIR/intermediate.crt" "$CA_DIR/intermediate.key" \
    -startdate 20221201000000Z \
    -enddate   20231201000000Z
mk_chain "$D" "$CA_DIR/ca-chain.crt"
ok "4431  Expired cert (2022-12-01 → 2023-12-01)"

# ─────────────────────────────────────────────────────────────────────────────
# PORT 4432 — Not yet valid certificate
# notBefore=2027-01-01  notAfter=2028-01-01
# ─────────────────────────────────────────────────────────────────────────────
D="$CERTS_DIR/not-yet-valid"
openssl genrsa -out "$D/server.key" 2048 2>/dev/null
openssl req -new -key "$D/server.key" -subj "$MAIN_SUBJ" -out "$D/server.csr" 2>/dev/null
write_ext > "$D/ext.cnf"
sign_with "$D" "$CA_DIR/intermediate.crt" "$CA_DIR/intermediate.key" \
    -startdate 20270101000000Z \
    -enddate   20280101000000Z
mk_chain "$D" "$CA_DIR/ca-chain.crt"
ok "4432  Not-yet-valid cert (2027-01-01 → 2028-01-01)"

# ─────────────────────────────────────────────────────────────────────────────
# PORT 4433 — Wrong hostname
# CN=evil.attacker.com  SAN=DNS:evil.attacker.com
# ─────────────────────────────────────────────────────────────────────────────
D="$CERTS_DIR/wrong-hostname"
openssl genrsa -out "$D/server.key" 2048 2>/dev/null
openssl req -new -key "$D/server.key" \
    -subj "/C=XX/O=Attacker Inc/CN=evil.attacker.com" \
    -out "$D/server.csr" 2>/dev/null
write_ext "DNS:evil.attacker.com" > "$D/ext.cnf"
sign_with "$D" "$CA_DIR/intermediate.crt" "$CA_DIR/intermediate.key" -days 365
mk_chain  "$D" "$CA_DIR/ca-chain.crt"
ok "4433  Wrong hostname cert (CN=evil.attacker.com)"

# ─────────────────────────────────────────────────────────────────────────────
# PORT 4434 — Self-signed (no CA chain)
# Signed with its own private key; no issuer
# ─────────────────────────────────────────────────────────────────────────────
D="$CERTS_DIR/self-signed"
openssl genrsa -out "$D/server.key" 2048 2>/dev/null
openssl req -new -key "$D/server.key" -subj "$MAIN_SUBJ" -out "$D/server.csr" 2>/dev/null

# No authorityKeyIdentifier — this is a self-signed cert with no issuer
cat > "$D/ext.cnf" << 'EXTEOF'
[ext]
subjectAltName=DNS:*.shongco.net,DNS:shongco.net
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth,clientAuth
basicConstraints=CA:FALSE
subjectKeyIdentifier=hash
EXTEOF

openssl x509 -req \
    -in "$D/server.csr" \
    -signkey "$D/server.key" \
    -sha256 -days 365 \
    -extfile "$D/ext.cnf" \
    -extensions ext \
    -out "$D/server.crt" 2>/dev/null

# No CA in chain — just the leaf cert
cp "$D/server.crt" "$D/fullchain.pem"
ok "4434  Self-signed cert (no CA chain)"

# ─────────────────────────────────────────────────────────────────────────────
# PORT 4435 — Untrusted CA
# Signed by Rogue CA — not in any system trust store
# ─────────────────────────────────────────────────────────────────────────────
D="$CERTS_DIR/untrusted-ca"
openssl genrsa -out "$D/server.key" 2048 2>/dev/null
openssl req -new -key "$D/server.key" -subj "$MAIN_SUBJ" -out "$D/server.csr" 2>/dev/null
write_ext > "$D/ext.cnf"
sign_with "$D" "$CA_DIR/rogue-ca.crt" "$CA_DIR/rogue-ca.key" -days 365
cat "$D/server.crt" "$CA_DIR/rogue-ca.crt" > "$D/fullchain.pem"
ok "4435  Untrusted CA cert (signed by Rogue CA)"

# ─────────────────────────────────────────────────────────────────────────────
# PORT 4436 — Weak key (RSA 1024-bit)
# Key size below 2048-bit minimum; modern clients reject this
# ─────────────────────────────────────────────────────────────────────────────
D="$CERTS_DIR/weak-key"
openssl genrsa -out "$D/server.key" 1024 2>/dev/null
openssl req -new -key "$D/server.key" -subj "$MAIN_SUBJ" -out "$D/server.csr" 2>/dev/null
write_ext > "$D/ext.cnf"
sign_with "$D" "$CA_DIR/intermediate.crt" "$CA_DIR/intermediate.key" -days 365
mk_chain  "$D" "$CA_DIR/ca-chain.crt"
ok "4436  Weak key cert (RSA 1024-bit)"

# ─────────────────────────────────────────────────────────────────────────────
# PORT 4437 — Wrong key usage (EKU missing serverAuth)
# EKU = clientAuth + emailProtection only  →  not valid for TLS server use
# ─────────────────────────────────────────────────────────────────────────────
D="$CERTS_DIR/wrong-ku"
openssl genrsa -out "$D/server.key" 2048 2>/dev/null
openssl req -new -key "$D/server.key" -subj "$MAIN_SUBJ" -out "$D/server.csr" 2>/dev/null
write_ext \
    "DNS:*.shongco.net,DNS:shongco.net" \
    "digitalSignature,keyEncipherment" \
    "clientAuth,emailProtection" \
    > "$D/ext.cnf"
sign_with "$D" "$CA_DIR/intermediate.crt" "$CA_DIR/intermediate.key" -days 365
mk_chain  "$D" "$CA_DIR/ca-chain.crt"
ok "4437  Wrong key usage cert (EKU: clientAuth+emailProtection, no serverAuth)"

# ─────────────────────────────────────────────────────────────────────────────
# PORT 4438 — Wildcard mismatch
# Cert is for *.other-domain.com — does not cover shongco.net
# ─────────────────────────────────────────────────────────────────────────────
D="$CERTS_DIR/wildcard-mismatch"
openssl genrsa -out "$D/server.key" 2048 2>/dev/null
openssl req -new -key "$D/server.key" \
    -subj "/C=US/O=Other Corp/CN=*.other-domain.com" \
    -out "$D/server.csr" 2>/dev/null
write_ext "DNS:*.other-domain.com,DNS:other-domain.com" > "$D/ext.cnf"
sign_with "$D" "$CA_DIR/intermediate.crt" "$CA_DIR/intermediate.key" -days 365
mk_chain  "$D" "$CA_DIR/ca-chain.crt"
ok "4438  Wildcard mismatch cert (CN=*.other-domain.com)"

chmod 400 "$CERTS_DIR"/*/server.key

# ─── STEP 5: CONFIGURE NGINX ─────────────────────────────────────────────────
step 5 "Configure Nginx"

NGINX_CONF_FILE="$NGINX_SITES_AVAIL/tls-lab.conf"

# Write a single server block
nginx_block() {
    local port="$1"
    local cert_subdir="$2"
    local test_name="$3"
    local expected="$4"
    local extra_directives="${5:-}"

    cat << BLOCK
server {
    listen ${port} ssl;
    server_name _;
    default_type text/plain;

    ssl_certificate     ${CERTS_DIR}/${cert_subdir}/fullchain.pem;
    ssl_certificate_key ${CERTS_DIR}/${cert_subdir}/server.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ${extra_directives}
    add_header X-TLS-Lab-Port     "${port}" always;
    add_header X-TLS-Lab-TestCase "${test_name}" always;

    location / {
        return 200 "TLS-Lab port=${port} test=${test_name} expected=${expected}\n";
    }
}

BLOCK
}

{
    echo "# TLS Certificate Test Lab — generated by setup.sh on $(date)"
    echo ""
    nginx_block 443  "valid"             "valid"            "OK-if-Fake-CA-is-trusted"
    nginx_block 4431 "expired"           "expired"          "ERR_CERT_DATE_INVALID"
    nginx_block 4432 "not-yet-valid"     "not-yet-valid"    "ERR_CERT_DATE_INVALID"
    nginx_block 4433 "wrong-hostname"    "wrong-hostname"   "ERR_CERT_COMMON_NAME_INVALID"
    nginx_block 4434 "self-signed"       "self-signed"      "ERR_CERT_AUTHORITY_INVALID"
    nginx_block 4435 "untrusted-ca"      "untrusted-ca"     "ERR_CERT_AUTHORITY_INVALID"
    nginx_block 4436 "weak-key"          "weak-key-rsa1024" "ERR_SSL_WEAK_SERVER_EPHEMERAL_DH_KEY" \
        'ssl_ciphers "DEFAULT:@SECLEVEL=0";'
    nginx_block 4437 "wrong-ku"          "wrong-key-usage"  "ERR_SSL_KEY_USAGE_INCOMPATIBLE"
    nginx_block 4438 "wildcard-mismatch" "wildcard-mismatch" "ERR_CERT_COMMON_NAME_INVALID"
} > "$NGINX_CONF_FILE"

ok "Written: $NGINX_CONF_FILE"

# Enable site
if [[ -n "$NGINX_SITES_EN" ]]; then
    ln -sf "$NGINX_CONF_FILE" "$NGINX_SITES_EN/tls-lab.conf"
    rm -f "$NGINX_SITES_EN/default"
    ok "Symlinked into sites-enabled, removed default site"
fi

# ─── STEP 6: OPEN FIREWALL ───────────────────────────────────────────────────
step 6 "Open firewall ports"

PORTS=(443 4431 4432 4433 4434 4435 4436 4437 4438)

if command -v ufw &>/dev/null; then
    for p in "${PORTS[@]}"; do ufw allow "$p/tcp" >/dev/null 2>&1 || true; done
    ok "ufw: allowed ${PORTS[*]}"
elif command -v firewall-cmd &>/dev/null; then
    for p in "${PORTS[@]}"; do
        firewall-cmd --permanent --add-port="$p/tcp" >/dev/null 2>&1 || true
    done
    firewall-cmd --reload >/dev/null 2>&1 || true
    ok "firewalld: opened ${PORTS[*]}"
else
    warn "No local firewall found — make sure EC2 Security Group allows TCP: ${PORTS[*]}"
fi

# ─── STEP 7: START / RELOAD NGINX ────────────────────────────────────────────
step 7 "Start / reload Nginx"

nginx -t 2>/dev/null && ok "nginx config syntax OK"
systemctl enable nginx >/dev/null 2>&1 || true
systemctl restart nginx
ok "nginx restarted"

# ─── STEP 8: SUMMARY ─────────────────────────────────────────────────────────
step 8 "Summary"

# Try EC2 metadata service for public IP
PUBLIC_IP=$(curl -sf --max-time 2 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null \
            || hostname -I | awk '{print $1}' \
            || echo "YOUR_EC2_IP")

CA_CHAIN="$CA_DIR/ca-chain.crt"

cat << SUMMARY

${BOLD}${GREEN}✅  TLS Test Lab is READY${NC}

${BOLD}Fake CA files${NC}
  Root CA chain : $CA_CHAIN
  (Import this to trust port 443 in your browser / curl)

${BOLD}Trust Fake CA on this machine${NC}
  Ubuntu  : cp $CA_DIR/root-ca.crt /usr/local/share/ca-certificates/fake-digicert.crt \\
              && update-ca-certificates
  AL2023  : cp $CA_DIR/root-ca.crt /etc/pki/ca-trust/source/anchors/ \\
              && update-ca-trust

${BOLD}Add to /etc/hosts (for domain-based testing)${NC}
  $PUBLIC_IP  shongco.net test.shongco.net

${BOLD}Quick test with openssl s_client${NC}
  # PORT   EXPECTED RESULT
  openssl s_client -connect $PUBLIC_IP:443  -CAfile $CA_CHAIN </dev/null   # OK
  openssl s_client -connect $PUBLIC_IP:4431 -CAfile $CA_CHAIN </dev/null   # certificate has expired
  openssl s_client -connect $PUBLIC_IP:4432 -CAfile $CA_CHAIN </dev/null   # certificate is not yet valid
  openssl s_client -connect $PUBLIC_IP:4433 -CAfile $CA_CHAIN </dev/null   # hostname mismatch
  openssl s_client -connect $PUBLIC_IP:4434 -CAfile $CA_CHAIN </dev/null   # self signed certificate
  openssl s_client -connect $PUBLIC_IP:4435 -CAfile $CA_CHAIN </dev/null   # unable to get local issuer cert
  openssl s_client -connect $PUBLIC_IP:4436 -CAfile $CA_CHAIN -cipher 'DEFAULT:@SECLEVEL=0' </dev/null  # weak key
  openssl s_client -connect $PUBLIC_IP:4437 -CAfile $CA_CHAIN -purpose sslserver </dev/null             # wrong EKU
  openssl s_client -connect $PUBLIC_IP:4438 -CAfile $CA_CHAIN </dev/null   # hostname mismatch

${BOLD}Run automated verification${NC}
  sudo ./verify.sh $PUBLIC_IP

SUMMARY
