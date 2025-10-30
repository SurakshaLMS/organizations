# Single-stage build for reliability (Prisma client issues with multi-stage)
FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache python3 make g++ wget curl

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client and build application
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build

# Skip pruning dev dependencies to keep Prisma CLI available
# This ensures Prisma client can be regenerated if needed

# Clean up build cache
RUN npm cache clean --force

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001
USER nestjs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/organization/api/v1/health || exit 1

# Start the application
CMD ["node", "dist/src/main.js"]
