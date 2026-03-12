#!/usr/bin/env bash
set -e

if [ -z "$PRIVATE_KEY" ]; then
  echo "ERROR: PRIVATE_KEY not set"
  exit 1
fi

RPC_URL="${RPC_URL:-https://sepolia.base.org}"
CHAIN_ID=84532

echo "Deploying to Base Sepolia ($RPC_URL)..."

forge script script/Deploy.s.sol \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --chain-id $CHAIN_ID \
  -vvvv

echo ""
echo "Update .env files with the new addresses from the broadcast output above."
echo "Files to update:"
echo "  back-end/.env    → MASJID_PROTOCOL_ADDRESS, VERIFIER_REGISTRY_ADDRESS"
echo "  front-end/.env.local → NEXT_PUBLIC_MASJID_PROTOCOL_ADDRESS, NEXT_PUBLIC_VERIFIER_REGISTRY_ADDRESS, NEXT_PUBLIC_IDRX_ADDRESS"
