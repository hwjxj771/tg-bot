const TelegramBot = require('node-telegram-bot-api');

// Твой токен (пока оставь такой, потом заменим)
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Ссылка на твою игру
const GAME_URL = 'https://t.me/gift_run_bot/app?startapp=game';

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
    

// Отправляем сообщение с картинкой и кнопкой
bot.sendPhoto(chatId, 'https://raw.githubusercontent.com/hwjxj771/tg-bot/main/picturebot.png', {
    caption: 'Скорее заходи в игру и получай подарки! 💫 Канал для получения специальных промо и новостей игры - @gift_run', // Текст ПОД картинкой
    reply_markup: keyboard
});


});

console.log('Бот запущен и ждет сообщения...');