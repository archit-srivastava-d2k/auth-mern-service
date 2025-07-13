# ----------- Build Stage -----------
FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# ----------- Production Stage -----------
FROM node:20-alpine as production

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./

RUN npm ci --ignore-scripts --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/server.js"]
