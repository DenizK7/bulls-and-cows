FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY client/package.json ./client/
RUN npm ci --workspace=client --workspace=@bulls-and-cows/shared --include-workspace-root
COPY packages/shared ./packages/shared
COPY client ./client
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
ENV GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
RUN npm run build -w client

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/client/.next/standalone ./
COPY --from=builder /app/client/.next/static ./client/.next/static
COPY --from=builder /app/client/public ./client/public
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "client/server.js"]
