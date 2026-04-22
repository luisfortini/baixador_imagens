FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev \
  && npx playwright install --with-deps chromium

COPY . .

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]
