FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
RUN mkdir -p /data/rooms && chown -R node:node /data
COPY src ./src
COPY server ./server
ENV HOST=0.0.0.0 PORT=8787 ROOM_DATA_DIR=/data/rooms
USER node
EXPOSE 8787
CMD ["node", "server/main.mjs"]
