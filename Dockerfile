# Multi-stage Dockerfile for NestJS (production)
# Builder stage: install deps, generate prisma client, build TS
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copy package manifests first to leverage Docker cache
COPY package.json package-lock.json* ./

# Install all deps (including devDeps for build)
RUN npm ci --silent

# Copy prisma schema so generation can run (if you use prisma)
COPY prisma ./prisma

# Copy source files
COPY . .

# Generate prisma client (if applicable) and build
RUN npx prisma generate --schema=prisma/schema.prisma || true
RUN npm run build

# Remove dev deps to reduce size
RUN npm prune --production

# Runner stage: smaller runtime image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy production node_modules and build output from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# If you have other runtime assets, copy them as needed
# COPY --from=builder /app/uploads ./uploads

EXPOSE 3001

# Start the app (matches package.json start:prod)
CMD ["node", "dist/main"]
