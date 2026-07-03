#!/bin/sh
set -e

# Ensure data directory exists
mkdir -p /app/data

echo "🔄 Running database migrations..."
cd /app/server
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "🚀 Starting server..."
exec node /app/server/dist/index.js
