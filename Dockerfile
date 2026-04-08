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

EXPOSE 10000

CMD ["sh", "-c", "while true; do node server.js; echo \"Server crashed, restarting in 3s...\"; sleep 3; done"]
