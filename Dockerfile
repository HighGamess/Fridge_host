FROM node:14

WORKDIR /app/backend

COPY backend/package*.json ./

RUN npm install

COPY backend/Bot ./Bot
COPY backend/Server ./Server

COPY backend/Bot/.env ./Bot/.env
COPY backend/Server/.env ./Server/.env

WORKDIR /app/proxy-frontend

COPY proxy-frontend ./proxy-frontend
RUN npm install @telegram-apps/sdk

WORKDIR /app/frontend

COPY frontend/package*.json ./

RUN npm install

WORKDIR /app/frontend
COPY frontend ./frontend

WORKDIR /app

EXPOSE 3000 4000 5000

CMD ["node", "Server/server.js"]