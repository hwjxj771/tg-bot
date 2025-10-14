const TelegramBot = require('node-telegram-bot-api');

// Твой токен (пока оставь такой, потом заменим)
const token = 'ТВОЙ_ТОКЕН_ЗДЕСЬ';
const bot = new TelegramBot(token, { polling: true });

// Ссылка на твою игру
const GAME_URL = 'https://tggift-d9996.web.app';

// Когда кто-то пишет /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    
    // Создаем кнопку
    const keyboard = {
        inline_keyboard: [[
            {
                text: '🎮 Играть',
                url: GAME_URL
            }
        ]]
    };
    
    // Отправляем сообщение
    bot.sendMessage(chatId, 'Скорее заходи в игру и получай подарки! 💫', {
        reply_markup: keyboard
    });
});

console.log('Бот запущен и ждет сообщения...');