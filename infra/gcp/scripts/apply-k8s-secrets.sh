#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 7 ]]; then
  echo "Uso: $0 <namespace> <domain> <sql_user> <sql_password> <sql_db> <jwt_secret> <nextauth_secret>"
  exit 1
fi

NAMESPACE="$1"
DOMAIN="$2"
SQL_USER="$3"
SQL_PASSWORD="$4"
SQL_DB="$5"
JWT_SECRET="$6"
NEXTAUTH_SECRET="$7"

kubectl -n "${NAMESPACE}" create secret generic api-secret \
  --from-literal=PORT=3001 \
  --from-literal=CORS_ORIGINS="https://${DOMAIN}" \
  --from-literal=JWT_SECRET="${JWT_SECRET}" \
  --from-literal=JWT_EXPIRES_IN=900s \
  --from-literal=JWT_REFRESH_EXPIRES_IN=7d \
  --from-literal=DEFAULT_PASSWORD='ChangeMe123!' \
  --from-literal=DATABASE_URL="postgresql://${SQL_USER}:${SQL_PASSWORD}@127.0.0.1:5432/${SQL_DB}?schema=public" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl -n "${NAMESPACE}" create secret generic web-secret \
  --from-literal=NEXTAUTH_URL="https://${DOMAIN}" \
  --from-literal=NEXTAUTH_SECRET="${NEXTAUTH_SECRET}" \
  --from-literal=API_BASE_URL="https://${DOMAIN}/api/v1" \
  --from-literal=NEXT_PUBLIC_API_BASE_URL="https://${DOMAIN}/api/v1" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Secrets aplicados en namespace ${NAMESPACE}."
