# Backend image (Express + pg + TypeScript)
FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy source
COPY . .

EXPOSE 4001

# Wait for the DB to be healthy, run migrations, then start.
CMD ["sh", "-c", "npx tsx src/migrations/run.ts && npx tsx src/index.ts"]
