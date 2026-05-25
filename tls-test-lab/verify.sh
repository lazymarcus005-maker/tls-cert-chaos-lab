#!/usr/bin/env bash
# =============================================================================
# TLS Certificate Test Lab — Verification Script
# Runs openssl s_client against each port and reports PASS / FAIL
#
# Usage:  sudo ./verify.sh [HOST]
#         HOST defaults to localhost
# =============================================================================

set -euo pipefail

HOST="${1:-localhost}"
CA_CHAIN="/etc/tls-lab/ca/ca-chain.crt"

[[ $EUID -eq 0 ]] || { echo "Run with sudo: sudo $0 [HOST]"; exit 1; }
[[ -f "$CA_CHAIN" ]] || { echo "Error: $CA_CHAIN not found. Run setup.sh first."; exit 1; }

# ─── COLORS ──────────────────────────────────────────────────────────────────
BOLD=$'\033[1m'
RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'
CYAN=$'\033[0;36m'; NC=$'\033[0m'

pass()  { printf "  ${GREEN}[PASS]${NC} %s\n" "$1"; }
fail()  { printf "  ${RED}[FAIL]${NC} %s\n" "$1"; }
warn()  { printf "  ${YELLOW}[WARN]${NC} %s\n" "$1"; }
detail(){ printf "         ${CYAN}%s${NC}\n" "$1"; }

TOTAL=0; PASSED=0; FAILED=0

# ─── CORE TEST FUNCTION ───────────────────────────────────────────────────────
# Args:
#   port        — TCP port
#   label       — Human-readable test name
#   expect_ok   — "true" if TLS should verify OK, "false" if it should fail
#   extra_flags — Optional extra flags for openssl s_client (e.g. -cipher ...)
test_port() {
    local port="$1"
    local label="$2"
    local expect_ok="$3"
    local extra_flags="${4:-}"

    TOTAL=$((TOTAL + 1))
    printf "\n${BOLD}Port %-5s${NC} — %s\n" "$port" "$label"

    # Run openssl s_client; capture output; ignore exit code (always continue)
    local raw
    raw=$(openssl s_client \
        -connect "${HOST}:${port}" \
        -CAfile "$CA_CHAIN" \
        -servername "test.shongco.net" \
        $extra_flags \
        </dev/null 2>&1 || true)

    # Extract verify return code line: "Verify return code: N (message)"
    local verify_line verify_code verify_msg
    verify_line=$(echo "$raw" | grep -i "Verify return code:" | tail -1 || true)
    verify_code=$(echo "$verify_line" | grep -oE '[0-9]+' | head -1 || echo "?")
    verify_msg=$(echo "$verify_line"  | sed 's/.*Verify return code: [0-9]* (//' | tr -d ')' || true)
    [[ -z "$verify_msg" ]] && verify_msg="(no verify message)"

    # Extract cert subject / dates
    local cert_info
    cert_info=$(echo "$raw" \
        | openssl x509 -noout -subject -issuer -dates 2>/dev/null \
        || echo "(could not parse certificate)")

    local ok_flag=false
    [[ "$verify_code" == "0" ]] && ok_flag=true

    if [[ "$expect_ok" == "true" ]]; then
        if $ok_flag; then
            pass "Verify OK (code 0) — as expected"
            PASSED=$((PASSED + 1))
        else
            fail "Verify FAILED (code ${verify_code}: ${verify_msg}) — expected OK"
            FAILED=$((FAILED + 1))
        fi
    else
        if ! $ok_flag; then
            pass "Verify FAILED (code ${verify_code}: ${verify_msg}) — as expected"
            PASSED=$((PASSED + 1))
        else
            fail "Verify OK (code 0) — expected a failure!"
            FAILED=$((FAILED + 1))
        fi
    fi

    # Print cert details
    while IFS= read -r line; do
        [[ -n "$line" ]] && detail "$line"
    done <<< "$cert_info"
}

# ─── RUN TESTS ───────────────────────────────────────────────────────────────
echo ""
printf "${BOLD}TLS Certificate Test Lab — Verification Report${NC}\n"
printf "${BOLD}Host: %-20s  Date: %s${NC}\n" "$HOST" "$(date)"
printf "%s\n" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Port  Label                                    ExpectOK  ExtraFlags
test_port 443  "Valid Certificate"               true
test_port 4431 "Expired Certificate"             false
test_port 4432 "Not Yet Valid Certificate"       false
test_port 4433 "Wrong Hostname (evil.attacker.com)" false
test_port 4434 "Self-Signed (no CA chain)"       false
test_port 4435 "Untrusted CA (Rogue CA)"         false
# RSA 1024: lower SECLEVEL so the handshake can proceed; server reachable but weak key visible
test_port 4436 "Weak Key (RSA 1024-bit)"         false  "-cipher DEFAULT:@SECLEVEL=0"
# Purpose check: openssl will fail if EKU does not include serverAuth
test_port 4437 "Wrong Key Usage (no serverAuth)" false  "-purpose sslserver"
test_port 4438 "Wildcard Mismatch (*.other-domain.com)" false

# ─── SUMMARY ─────────────────────────────────────────────────────────────────
echo ""
printf "%s\n" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
printf "\n${BOLD}Results: %d/%d passed" "$PASSED" "$TOTAL"

if [[ $FAILED -eq 0 ]]; then
    printf "  ${GREEN}✅  All tests behaved as expected!${NC}\n\n"
else
    printf "  ${RED}(%d unexpected)${NC}\n\n" "$FAILED"
fi

printf "%-6s %-8s %-52s %s\n" "Port" "Status" "Test Case" "Expected Behavior"
printf "%s\n" "──────────────────────────────────────────────────────────────────────────"
printf "%-6s %-8s %-52s %s\n" "443"  "expect OK"   "Valid Certificate"                 "Verify return code: 0 (ok)"
printf "%-6s %-8s %-52s %s\n" "4431" "expect FAIL" "Expired Certificate"               "code 10 (certificate has expired)"
printf "%-6s %-8s %-52s %s\n" "4432" "expect FAIL" "Not Yet Valid"                     "code 9 (certificate is not yet valid)"
printf "%-6s %-8s %-52s %s\n" "4433" "expect FAIL" "Wrong Hostname"                    "code 62 (hostname mismatch)"
printf "%-6s %-8s %-52s %s\n" "4434" "expect FAIL" "Self-Signed"                       "code 18 (self signed certificate)"
printf "%-6s %-8s %-52s %s\n" "4435" "expect FAIL" "Untrusted CA"                      "code 20 (unable to get local issuer cert)"
printf "%-6s %-8s %-52s %s\n" "4436" "expect FAIL" "Weak Key (RSA 1024)"               "handshake or key size rejection"
printf "%-6s %-8s %-52s %s\n" "4437" "expect FAIL" "Wrong Key Usage (no serverAuth)"   "unsuitable certificate purpose"
printf "%-6s %-8s %-52s %s\n" "4438" "expect FAIL" "Wildcard Mismatch"                 "code 62 (hostname mismatch)"
echo ""

# Trust Fake CA hint
printf "${YELLOW}Tip:${NC} To make port 443 pass, trust the Fake CA:\n"
printf "  Ubuntu  : cp /etc/tls-lab/ca/root-ca.crt /usr/local/share/ca-certificates/fake-digicert.crt && update-ca-certificates\n"
printf "  AL2023  : cp /etc/tls-lab/ca/root-ca.crt /etc/pki/ca-trust/source/anchors/ && update-ca-trust\n\n"
