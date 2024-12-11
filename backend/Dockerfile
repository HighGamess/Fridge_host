# Используем базовый образ Node.js
FROM node:14

# Устанавливаем рабочую директорию для нашего приложения
WORKDIR /app

# Копируем package.json и package-lock.json для установки зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем весь код в рабочую директорию
COPY Bot ./Bot
COPY Server ./Server
COPY DataFrontend ./DataFrontend
COPY frontend ./frontend

# Копируем .env файлы
COPY Bot/.env ./Bot/.env
COPY Server/.env ./Server/.env

# Открываем порты для серверов
EXPOSE 3000 4000 5000

# Команда для запуска основного сервера (можно модифицировать под docker-compose)
CMD ["node", "Server/server.js"]
