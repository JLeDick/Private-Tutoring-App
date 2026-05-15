#!/bin/sh
set -e
echo "Running database migrations..."
prisma migrate deploy --schema=./prisma/schema.prisma
echo "Starting server..."
exec "$@"
