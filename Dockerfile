# Use Node.js 20 LTS as the base image
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies needed for building
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Build stage
FROM base AS builder

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Create app directory
WORKDIR /app

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

# Copy built application and node_modules
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=base --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --chown=appuser:nodejs package*.json ./

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const options = { host: 'localhost', port: 5000, timeout: 2000 }; const req = http.request(options, (res) => { if (res.statusCode === 200 || res.statusCode === 404) process.exit(0); else process.exit(1); }); req.on('error', () => process.exit(1)); req.end();"

# Start the application
CMD ["npm", "start"]