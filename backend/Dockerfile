# Multi-stage Dockerfile for NestJS app

# Development stage
FROM node:20-alpine AS development
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
EXPOSE 3000
CMD ["yarn", "start:dev"]

# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production
COPY --from=build /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main"]
