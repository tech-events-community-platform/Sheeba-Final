# Stage 1: Build the TypeScript backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests first for efficient Docker layer caching
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Minimal Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled JavaScript and DB migrations schema from builder
COPY --chown=node:node --from=builder /app/dist ./dist

# Set ownership and drop root privileges
RUN chown -R node:node /app

USER node

EXPOSE 5000

CMD ["node", "dist/server.js"]
