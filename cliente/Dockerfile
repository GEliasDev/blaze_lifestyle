FROM node:22-alpine AS build
WORKDIR /app

# Vite bakes env vars into the bundle at build time, so it must be present
# here — passed in as a Docker build arg (Coolify's "Inject Build Args to
# Dockerfile" setting forwards its Environment Variables as --build-arg).
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
