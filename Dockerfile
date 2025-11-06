# Multi-stage build for NestJS application
FROM node:20-alpine AS builder

# Install OpenSSL (required by Prisma)
RUN apk add --no-cache openssl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (needed for build and Prisma)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Verify build
RUN ls -la dist/ && (test -f dist/src/main.js || test -f dist/main.js)

# Production stage
FROM node:20-alpine AS production

# Install OpenSSL and other runtime dependencies
RUN apk add --no-cache openssl curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --omit=dev

# Generate Prisma Client in production
RUN npx prisma generate

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy entrypoint script for diagnostics
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 8080

# Environment variables with defaults
ENV NODE_ENV=production
ENV PORT=8080

# Start the application with diagnostics
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
