const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const GAME_URL = 'https://t.me/gift_run_bot/tgiftiF12QIDdag';

// Временное хранилище пользователей
const userChatIds = new Set();

// Команда чтобы узнать свой chatId
bot.onText(/\/myid/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `Ваш chatId: ${chatId}`);
    console.log(`ChatId пользователя: ${chatId}`);
});

// Когда кто-то пишет /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    
    // Сохраняем пользователя
    userChatIds.add(chatId);
    console.log(`Новый пользователь: ${chatId}, всего: ${userChatIds.size}`);
    
    const keyboard = {
        inline_keyboard: [[
            {
                text: 'Играть 🚀',
                url: GAME_URL
            }
        ]]
    };
    
    bot.sendPhoto(chatId, 'https://raw.githubusercontent.com/hwjxj771/tg-bot/main/bot4.png', {
        caption: 'Кликер! Кейсы! CRUSH MODE! И другие режимы!💫 Канал для получения специальных промо и новостей игры - @gift_run',
        reply_markup: keyboard
    });
});

// Функция рассылки
async function sendBroadcastMessage() {
    const message = 'Бесплатный ежедневный кейс обновлен - открывай и забирай награду 🔥';
    
    const keyboard = {
        inline_keyboard: [[
            {
                text: 'Забрать награду 🎁',
                url: GAME_URL
            }
        ]]
    };
    
    console.log(`Начинаю рассылку для ${userChatIds.size} пользователей...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const chatId of userChatIds) {
        try {
            await bot.sendMessage(chatId, message, {
                reply_markup: keyboard
            });
            successCount++;
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            console.error(`Ошибка пользователю ${chatId}:`, error.message);
            errorCount++;
            if (error.response?.statusCode === 403) {
                userChatIds.delete(chatId);
            }
        }
    }
    
    console.log(`Рассылка завершена! Успешно: ${successCount}, Ошибок: ${errorCount}`);
    return { successCount, errorCount };
}

// Команда для рассылки (пока без проверки админа)
bot.onText(/\/broadcast/, async (msg) => {
    const chatId = msg.chat.id;
    
    // Временно разрешаем всем запускать рассылку для тестирования
    const result = await sendBroadcastMessage();
    bot.sendMessage(chatId, `Рассылка завершена! Отправлено: ${result.successCount}, Ошибок: ${result.errorCount}`);
});

console.log('Бот запущен и ждет сообщения...');

// Экспортируем функцию для возможности запуска извне
module.exports = { sendBroadcastMessage };