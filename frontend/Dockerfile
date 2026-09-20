# Stage 1: Build Vite React application
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite embeds env vars at build time
ARG VITE_API_URL=https://api.sheebanet.com/api
ARG VITE_GOOGLE_CLIENT_ID=415994350759-tfifv80t1u3efof3m136g0i0d9nkg4p6.apps.googleusercontent.com

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN npm run build

# Stage 2: Serve static files with high-performance Nginx
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
