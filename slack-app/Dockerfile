FROM node:22-alpine AS base

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY app.js manifest.json ./
COPY src ./src

ENV NODE_ENV=production

CMD ["node", "app.js"]
