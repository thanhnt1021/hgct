FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 build-essential openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time-only secrets — CHỈ để `next build` collect page data qua các module-level
# check (vd src/lib/db.ts PrismaClient, src/lib/ctv/auth.ts) không throw. KHÔNG copy sang
# stage `runner` — giá trị thật lúc RUNTIME container vẫn lấy qua `env_file` trong
# docker-compose.yml, không phải từ ARG này. Fix tạm ngoài scope phiếu P001 — xem ticket.
ARG DATABASE_URL
ARG NEXTAUTH_SECRET
ARG CTV_JWT_SECRET
ENV DATABASE_URL=${DATABASE_URL}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ENV CTV_JWT_SECRET=${CTV_JWT_SECRET}
RUN npx prisma generate
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates fonts-liberation openssl ghostscript \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 \
    libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libglib2.0-0 libgtk-3-0 \
    libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 \
    libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 \
    libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/ephe ./ephe
COPY --from=builder /app/imgs ./imgs
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

RUN mkdir -p /var/hgct/pdfs && chown -R node:node /var/hgct/pdfs /app
USER node

ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["node", "server.js"]
