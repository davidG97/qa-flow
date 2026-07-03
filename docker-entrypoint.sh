#!/bin/sh
set -e

# Ensure data directory exists
mkdir -p /app/data

# Set DATABASE_URL if not set
export DATABASE_URL="${DATABASE_URL:-file:/app/data/qa-flow.db}"

echo "🔄 Running database migrations..."
cd /app/server
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "🚀 Starting server..."
exec node /app/server/dist/index.js
