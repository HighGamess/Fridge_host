const TelegramBot = require("node-telegram-bot-api");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN  

//https://anon121213.github.io/FridgeHost/?tgId
const FRONTEND_URL = process.env.FRONTEND_URL
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const gameName = process.env.TELEGRAM_GAME_SHORT_NAME  ;
const queries = {};

bot.onText(/help/, (msg) => {
    bot.sendMessage(msg.from.id, "Say /game if you want to play.");
});

bot.onText(/start|game/, (msg) => {
    // Нет смысла прокидывать from.id через теги т.к мы и так получим его id и другие данные
    // из init_data https://core.telegram.org/bots/webapps#webappinitdata

    // и вынеси gameurl в env
    const gameurl = `${FRONTEND_URL}/?tgId=${msg.from.id}`;
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
        queries[query.id] = query;
        // Нет смысла прокидывать from.id через теги т.к мы и так получим его id и другие данные
        // из init_data https://core.telegram.org/bots/webapps#webappinitdata

         // и вынеси gameurl в env
        const gameurl = `${FRONTEND_URL}/?tgId=${query.from.id}`;
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


console.log("bot is run");
