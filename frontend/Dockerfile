FROM node:20-alpine AS base

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production=false

COPY tsconfig.json next.config.mjs postcss.config.mjs tailwind.config.ts ./
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY public ./public

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=base /app/package.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public

EXPOSE 3000

CMD ["npm", "start"]

