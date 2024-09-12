# Используем официальный образ Node.js для бота
FROM node:14 AS bot

# Устанавливаем рабочую директорию для бота
WORKDIR /usr/src/bot

# Копируем файлы бота в контейнер
COPY Bot/package*.json ./
COPY Bot/index.js ./

# Устанавливаем зависимости и запускаем бота
RUN npm install
RUN npm i node-telegram-bot-api
RUN npm install telegraf
RUN npm install express --save

CMD ["npm", "start"]

# Используем официальный образ Nginx для хостинга игры
FROM nginx:alpine AS web

# Копируем файлы игры в директорию Nginx
COPY Game /usr/share/nginx/html

# Указываем, что контейнер будет использовать порт 80
EXPOSE 80

# Запускаем Nginx
CMD ["nginx", "-g", "daemon off;"]

# Используем Docker Compose для запуска обоих контейнеров docker-compose up --build
