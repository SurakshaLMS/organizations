# Multi-stage build for NestJS application
FROM node:20-alpine AS development

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (include dev deps for building)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client BEFORE building (critical for TypeScript compilation)
RUN echo "=== Generating Prisma client ===" && \
    npx prisma generate --schema=prisma/schema.prisma && \
    echo "=== Verifying Prisma client generation ===" && \
    ls -la node_modules/.prisma/client/ && \
    echo "=== Checking for required enums ===" && \
    grep -E "(OrganizationType|OrganizationRole)" node_modules/.prisma/client/index.d.ts | head -10 || echo "Enums not found in generated client"

# Build the application
RUN echo "=== Building NestJS application ===" && \
    npm run build

# Production stage
FROM node:20-alpine AS production

# Install necessary runtime dependencies
RUN apk add --no-cache openssl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy Prisma schema (needed for generation)
COPY --from=development /app/prisma ./prisma

# Install ALL dependencies (including devDependencies needed for Prisma)
RUN npm ci

# Generate Prisma Client in production
RUN npx prisma generate --schema=prisma/schema.prisma

# Copy built application from development stage
COPY --from=development /app/dist ./dist

# Verify production setup
RUN echo "=== Production stage verification ===" && \
    ls -la dist/ && \
    ls -la dist/src/ || echo "dist/src not found" && \
    ls -la node_modules/@prisma/client/ && \
    ls -la node_modules/.prisma/client/ && \
    echo "=== Checking main.js exists ===" && \
    test -f dist/src/main.js && echo "main.js found" || (test -f dist/main.js && echo "main.js found in dist/" || echo "main.js NOT found")

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

USER nestjs

# Expose port (Cloud Run uses PORT environment variable, default 8080)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8080}/organization/api/v1/health || exit 1

# Start the application
CMD ["node", "dist/src/main.js"]
