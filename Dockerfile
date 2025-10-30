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

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from development stage
COPY --from=development /app/dist ./dist

# Copy Prisma schema and generated client
COPY --from=development /app/prisma ./prisma
COPY --from=development /app/node_modules/.prisma ./node_modules/.prisma

# Copy node_modules from development (in case any runtime deps are needed)
COPY --from=development /app/node_modules ./node_modules

# Verify production setup
RUN echo "=== Production stage verification ===" && \
    ls -la dist/src/ && \
    ls -la node_modules/@prisma/client/ && \
    ls -la node_modules/.prisma/client/ && \
    echo "=== Checking main.js exists ===" && \
    test -f dist/src/main.js && echo "main.js found" || echo "main.js NOT found"

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Change ownership of the app directory
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port (Cloud Run uses PORT environment variable, default 8080)
EXPOSE 8080

# Health check (using PORT environment variable)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8080}/health || exit 1

# Start the application (correct path based on NestJS build output)
CMD ["node", "dist/src/main.js"]
