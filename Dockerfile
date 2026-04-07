FROM node:20-slim AS builder

WORKDIR /app
COPY package.json ./
COPY prisma/ ./prisma/
RUN npm install
RUN npx prisma generate
COPY src/ ./src/
COPY public/ ./public/
COPY next.config.js ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY tsconfig.json ./
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone/ ./
COPY --from=builder /app/.next/static/ ./.next/static/
COPY --from=builder /app/public/ ./public/
EXPOSE 10000
CMD ["node", "server.js"]
