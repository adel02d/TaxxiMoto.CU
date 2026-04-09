FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

COPY package.json ./
COPY prisma/ ./prisma/
RUN npm install
RUN npx prisma generate

COPY src/ ./src/
COPY next.config.js ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY tsconfig.json ./

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
COPY --from=builder /app/src/ ./src/
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/tsconfig.json ./

EXPOSE 10000

CMD ["npx", "next", "start", "-p", "10000"]FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

COPY package.json ./
COPY prisma/ ./prisma/
RUN npm install
RUN npx prisma generate

COPY src/ ./src/
COPY next.config.js ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY tsconfig.json ./

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
COPY --from=builder /app/src/ ./src/
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/tsconfig.json ./

EXPOSE 10000

CMD ["npx", "next", "start", "-p", "10000"]
