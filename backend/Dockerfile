# ===========================
# Stage 1: Builder
# ===========================
FROM node:20-alpine AS builder

# Create app directory
WORKDIR /app

# Install OS deps (if you ever need e.g. node-gyp builds, keep build-base; otherwise you can drop it)
RUN apk add --no-cache python3 make g++ git

# Install dependencies (layer-cached)
COPY package*.json ./
RUN npm ci

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# ===========================
# Stage 2: Production
# ===========================
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Only copy package manifests to install prod deps
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy compiled JS (and any runtime config if needed)
COPY --from=builder /app/dist ./dist

# Set NODE_ENV
ENV NODE_ENV=production

# Expose backend port
EXPOSE 4000

# Use non-root user
USER appuser

# Start the app with Node (not ts-node)
CMD ["node", "dist/server.js"]