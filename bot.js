const TelegramBot = require('node-telegram-bot-api');

// Твой токен (пока оставь такой, потом заменим)
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Ссылка на твою игру
const GAME_URL = 'http://t.me/gift_run_bot/tgiftiF12QIDdag';

// Когда кто-то пишет /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    
// Создаем кнопку
const keyboard = {
    inline_keyboard: [[
        {
            text: 'Играть 🚀',
            url: GAME_URL
        }
    ]]
};
    

    // Отправляем 3 фотки с текстом на последней
    bot.sendPhoto(chatId, 'https://raw.githubusercontent.com/hwjxj771/tg-bot/main/bot1.png');
    bot.sendPhoto(chatId, 'https://raw.githubusercontent.com/hwjxj771/tg-bot/main/bot2.png');
    bot.sendPhoto(chatId, 'https://raw.githubusercontent.com/hwjxj771/tg-bot/main/bot3.png', {
        caption: 'Скорее заходи в игру и получай подарки! Кликер! Кейсы! CRUSH MODE! И другие режимы!                        💫 Канал для получения специальных промо и новостей игры - @gift_run',
        reply_markup: keyboard
    });

});

console.log('Бот запущен и ждет сообщения...');