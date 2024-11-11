require('dotenv').config();
const TelegramBot = require("node-telegram-bot-api");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN; // Использование переменной окружения для токена
const GAME_URL = process.env.GAME_URL; // Использование переменной окружения для URL игры
const bot = new TelegramBot(TOKEN, { polling: true });
const gameName = "fridgeTestGame";

bot.onText(/help/, (msg) => {
    bot.sendMessage(msg.from.id, "Say /game if you want to play.");
});

bot.onText(/start|game/, (msg) => {
    const gameurl = `${GAME_URL}?tgId=${msg.from.id}`;
    bot.sendGame(msg.from.id, gameName).catch((error) => {
        console.error("Error sending game:", error);
    });
    bot.answerCallbackQuery({
        callback_query_id: msg.message_id,
        url: gameurl
    }).catch((error) => {
        console.error("Error responding to callback query:", error);
    });
});

bot.on("callback_query", (query) => {
    if (query.game_short_name !== gameName) {
        bot.answerCallbackQuery({
            callback_query_id: query.id,
            text: `Sorry, '${query.game_short_name}' is not available.`,
        }).catch((error) => {
            console.error("Error responding to callback query:", error);
        });
    } else {
        const gameurl = `${GAME_URL}?initData=${query.data}`;
        bot.answerCallbackQuery({
            callback_query_id: query.id,
            url: gameurl,
        }).catch((error) => {
            console.error("Error responding to callback query:", error);
        });
    }
});

bot.on("inline_query", (iq) => {
    bot.answerInlineQuery(iq.id, [
        {
            type: "game",
            id: "0",
            game_short_name: gameName,
        },
    ]).catch((error) => {
        console.error("Error responding to inline query:", error);
    });
});

console.log("bot is running");
