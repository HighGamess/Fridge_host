# Используем официальный образ Node.js для бота
FROM node:14 AS bot

# Устанавливаем рабочую директорию для бота
WORKDIR /usr/src/bot

# Копируем файлы бота в контейнер
COPY ./package*.json ./
COPY ./index.js ./

# Устанавливаем зависимости и запускаем бота
RUN npm install
RUN npm i node-telegram-bot-api
RUN npm install telegraf
RUN npm install express --save

CMD ["npm", "start"]


