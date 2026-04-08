FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY server/package.json ./server/
RUN npm ci --workspace=@bulls-and-cows/shared --workspace=@bulls-and-cows/server --include-workspace-root
COPY packages/shared ./packages/shared
COPY server ./server
COPY packages/shared/tsconfig.json ./packages/shared/
RUN npm run build -w @bulls-and-cows/shared && npm run build -w @bulls-and-cows/server

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package.json /app/package-lock.json /app/tsconfig.base.json ./
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/server/dist ./server/dist
RUN npm ci --workspace=@bulls-and-cows/shared --workspace=@bulls-and-cows/server --include-workspace-root --omit=dev
WORKDIR /app/server
CMD ["node", "dist/index.js"]
