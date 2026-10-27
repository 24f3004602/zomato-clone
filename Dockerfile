FROM node:22.23.4-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22.23.4-alpine AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22.23.4-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app ./
RUN chown -R node:node /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --retries=12 CMD wget --spider --quiet http://localhost:3000/api/health/ready || exit 1
CMD ["sh", "-c", "npm run db:migrate:deploy && npm run start"]
