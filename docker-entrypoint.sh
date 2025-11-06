#!/bin/sh
# Simple startup test script

echo "=== Starting Application Diagnostics ==="
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Working directory: $(pwd)"
echo ""

echo "=== Checking dist folder ==="
ls -la dist/ || echo "dist/ not found!"
ls -la dist/src/ || echo "dist/src/ not found!"
echo ""

echo "=== Checking main.js ==="
if [ -f "dist/src/main.js" ]; then
    echo "✓ main.js found at dist/src/main.js"
elif [ -f "dist/main.js" ]; then
    echo "✓ main.js found at dist/main.js"
else
    echo "✗ main.js not found!"
    exit 1
fi
echo ""

echo "=== Checking Prisma Client ==="
ls -la node_modules/.prisma/client/ || echo "Prisma client not found!"
ls -la node_modules/@prisma/client/ || echo "@prisma/client not found!"
echo ""

echo "=== Environment Variables ==="
echo "NODE_ENV: ${NODE_ENV}"
echo "PORT: ${PORT}"
echo "DATABASE_URL: ${DATABASE_URL:0:30}..." # Show only first 30 chars
echo ""

echo "=== Starting Node Application ==="
exec node dist/src/main.js
