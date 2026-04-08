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

COPY --from=builder /app/.next/standalone/ ./
COPY --from=builder /app/.next/static/ ./.next/static/
COPY --from=builder /app/node_modules/.prisma/ ./node_modules/.prisma/
COPY --from=builder /app/node_modules/@prisma/ ./node_modules/@prisma/

EXPOSE 10000

CMD ["node", "server.js"]FROM node:20-slim AS builder

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

# Copy standalone output
COPY --from=builder /app/.next/standalone/ ./

# Copy static files for the frontend
COPY --from=builder /app/.next/static/ ./.next/static/

# CRITICAL: Copy Prisma engine binaries (standalone does NOT trace .node native files)
COPY --from=builder /app/node_modules/.prisma/ ./node_modules/.prisma/
COPY --from=builder /app/node_modules/@prisma/ ./node_modules/@prisma/

EXPOSE 10000

CMD ["node", "server.js"]
