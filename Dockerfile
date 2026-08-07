FROM node:20-slim AS builder

WORKDIR /app

# Instalar dependencias necesarias para Prisma
RUN apt-get update -y && apt-get install -y openssl

COPY package.json package-lock.json* ./
COPY prisma/ ./prisma/

RUN npm install
RUN npx prisma generate

COPY . .

# Construir la aplicación
RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

ENV NODE_ENV=production
ENV PORT=10000

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/.next/ ./.next/
COPY --from=builder /app/prisma/ ./prisma/
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public/ ./public/ || true

EXPOSE 10000

# Script para asegurar que la base de datos esté lista antes de empezar
CMD npx prisma db push && npx next start -p 10000
