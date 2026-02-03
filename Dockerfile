# Use Node.js 20 LTS as the base image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies needed for building
RUN apk add --no-cache libc6-compat

# Copy package files first for better caching
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Build the application (frontend + backend)
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Create app directory
WORKDIR /app

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

# Copy package files
COPY --chown=appuser:nodejs package*.json ./

# Install production dependencies only (smaller image)
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder stage (dist/public = frontend, dist/index.js = server)
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist

# Switch to non-root user
USER appuser

# App listens on PORT (default 5000)
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

# Health check: hit /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const h=require('http');const o={host:'localhost',port:5000,path:'/api/health',timeout:3000};h.get(o,(r)=>{const s=r.statusCode;process.exit(s>=200&&s<500?0:1)}).on('error',()=>process.exit(1));"

# Start the server (no cross-env needed; NODE_ENV set above)
CMD ["node", "dist/index.js"]