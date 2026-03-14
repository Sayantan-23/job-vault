# Multi-stage Dockerfile for Nuxt app

# Base stage with Node.js
FROM node:22-alpine AS base
WORKDIR /app

# Copy package files
COPY package.json yarn.lock* ./

# Development stage
FROM base AS development
# Install all dependencies (including dev dependencies)
RUN yarn install

# Copy source code
COPY . .

# Expose development port
EXPOSE 3000

# Start development server
CMD ["yarn", "dev", "--host", "0.0.0.0"]

# Production dependencies stage
FROM base AS prod-deps
# Install only production dependencies
RUN yarn install --frozen-lockfile --prod

# Build stage
FROM base AS build

# Install all dependencies for building
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Increase Node.js memory limit for build (CI runners may have limited defaults)
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build the application
RUN yarn build

# Production stage
FROM node:22-alpine AS production
WORKDIR /app

# Copy production dependencies
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/.output ./.output
COPY --from=build /app/nuxt.config.ts ./nuxt.config.ts
COPY --from=build /app/package.json ./package.json

# Create storage directories with proper permissions
RUN mkdir -p /app/storage/public /app/storage/temp

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nuxt -u 1001 -G nodejs

# Change ownership of app directory
RUN chown -R nuxt:nodejs /app

# Switch to non-root user
USER nuxt

# Expose production port
EXPOSE 3000

# Start production server
CMD ["node", ".output/server/index.mjs"]