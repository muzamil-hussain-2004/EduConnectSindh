# Backend image for the one-command demo (see ../docker-compose.yml).
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY src/database/prisma ./src/database/prisma
# A placeholder URL is enough to generate the Prisma client; the real one is set at runtime.
RUN DATABASE_URL=postgresql://x:x@localhost:5432/x npm ci --include=dev

COPY . .
RUN npm run build && mkdir -p uploads/.private

EXPOSE 5000
# Apply migrations, seed (safe to repeat), then start the API.
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/server.js"]
