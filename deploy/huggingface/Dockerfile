# Hugging Face Space: builds and runs the backend straight from GitHub.
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends git openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Hugging Face runs containers as user 1000, which is the built-in "node" user.
USER node
ENV HOME=/home/node
WORKDIR /home/node/app

# Change this value (or use "Factory rebuild") to pull the latest code from GitHub.
ARG REPO_REF=main
RUN echo "ref: $REPO_REF" \
  && git clone --depth 1 --branch "$REPO_REF" https://github.com/muzamil-hussain-2004/EduConnectSindh.git .

WORKDIR /home/node/app/backend

# A placeholder URL is enough to generate the Prisma client; the real one is a runtime secret.
RUN DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder npm ci --include=dev \
  && npm run build \
  && mkdir -p uploads/.private

ENV NODE_ENV=production \
    PORT=7860 \
    COOKIE_SAME_SITE=none

EXPOSE 7860

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
