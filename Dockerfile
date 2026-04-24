FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 4200
# --host 0.0.0.0 is required so Docker can forward the port to the host.
# --poll 2000 enables file-change detection inside Docker (inotify not available in Alpine).
# --disable-host-check allows access via the container name in Docker Compose networks.
CMD ["npm", "run", "start", "--", "--host", "0.0.0.0", "--poll", "2000", "--disable-host-check"]
