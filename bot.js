const TelegramBot = require('node-telegram-bot-api');
const { Pool } = require('pg');

// Настройка базы данных PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Инициализация базы данных
async function initDatabase() {
  try {
    const client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        chat_id BIGINT PRIMARY KEY,
        username VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ База данных готова');
    client.release();
  } catch (error) {
    console.error('❌ Ошибка базы данных:', error);
  }
}

// Добавление пользователя
async function addUser(chatId, userInfo = {}) {
  try {
    const { username, first_name, last_name } = userInfo;
    await pool.query(
      `INSERT INTO users (chat_id, username, first_name, last_name, last_active) 
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (chat_id) 
       DO UPDATE SET 
         username = EXCLUDED.username,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         last_active = CURRENT_TIMESTAMP`,
      [chatId, username, first_name, last_name]
    );
    return true;
  } catch (error) {
    console.error('Ошибка добавления пользователя:', error);
    return false;
  }
}

// Получение всех пользователей
async function getAllUsers() {
  try {
    const result = await pool.query('SELECT chat_id FROM users');
    return result.rows.map(row => row.chat_id);
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    return [];
  }
}

// Получение количества пользователей
async function getUserCount() {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Ошибка подсчета пользователей:', error);
    return 0;
  }
}

// Удаление пользователя
async function removeUser(chatId) {
  try {
    await pool.query('DELETE FROM users WHERE chat_id = $1', [chatId]);
    return true;
  } catch (error) {
    console.error('Ошибка удаления пользователя:', error);
    return false;
  }
}

// Основной код бота
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const GAME_URL = 'https://t.me/gift_run_bot/tgiftiF12QIDdag';

// Инициализируем базу данных при запуске
initDatabase();

// ЗАМЕНИ ЭТОТ НОМЕР НА СВОЙ CHAT_ID (узнаешь через /myid)
const ADMIN_IDS = [7002066167];

// Команда для получения chatId
bot.onText(/\/myid/, async (msg) => {
  const chatId = msg.chat.id;
  const userCount = await getUserCount();
  bot.sendMessage(chatId, `📊 Ваш chatId: ${chatId}\n👥 Всего пользователей в базе: ${userCount}`);
  console.log(`ChatId пользователя: ${chatId}`);
});

// Команда статистики для админа
bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  
  if (!ADMIN_IDS.includes(chatId)) {
    return bot.sendMessage(chatId, '❌ У вас нет прав для этой команды.');
  }
  
  const userCount = await getUserCount();
  bot.sendMessage(chatId, `📊 Статистика бота:\n\n👥 Всего пользователей: ${userCount}`);
});

// Основная команда /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userInfo = msg.from;
  
  // Сохраняем пользователя в базу
  await addUser(chatId, userInfo);
  const userCount = await getUserCount();
  
  console.log(`Новый пользователь: ${chatId}, всего в базе: ${userCount}`);
  
  // Создаем кнопку
  const keyboard = {
    inline_keyboard: [[
      {
        text: 'Играть 🚀',
        url: GAME_URL
      }
    ]]
  };
  
  // Отправляем фотку с текстом и кнопкой
  bot.sendPhoto(chatId, 'https://raw.githubusercontent.com/hwjxj771/tg-bot/main/bot4.png', {
    caption: 'Кликер! Кейсы! CRUSH MODE! И другие режимы!💫 Канал для получения специальных промо и новостей игры - @gift_run',
    reply_markup: keyboard
  });
});

// Функция массовой рассылки
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
  
  // Получаем всех пользователей из базы
  const allUsers = await getAllUsers();
  
  console.log(`📨 Начинаю рассылку для ${allUsers.length} пользователей...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const chatId of allUsers) {
    try {
      await bot.sendMessage(chatId, message, {
        reply_markup: keyboard
      });
      successCount++;
      
      // Задержка чтобы не превысить лимиты Telegram API
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Ошибка отправки пользователю ${chatId}:`, error.message);
      errorCount++;
      
      // Если пользователь заблокировал бота, удаляем из базы
      if (error.response?.statusCode === 403) {
        await removeUser(chatId);
        console.log(`🗑️ Удален заблокировавший пользователь: ${chatId}`);
      }
    }
  }
  
  console.log(`✅ Рассылка завершена! Успешно: ${successCount}, Ошибок: ${errorCount}`);
  return { successCount, errorCount, totalUsers: allUsers.length };
}

// Команда для рассылки (только для админа)
bot.onText(/\/broadcast/, async (msg) => {
  const chatId = msg.chat.id;
  
  if (!ADMIN_IDS.includes(chatId)) {
    return bot.sendMessage(chatId, '❌ У вас нет прав для этой команды.');
  }
  
  const processingMsg = await bot.sendMessage(chatId, '🔄 Запускаю рассылку всем пользователям...');
  
  const result = await sendBroadcastMessage();
  
  await bot.editMessageText(
    `✅ Рассылка завершена!\n\n📊 Результаты:\n• Всего пользователей: ${result.totalUsers}\n• Успешно отправлено: ${result.successCount}\n• Ошибок: ${result.errorCount}`,
    {
      chat_id: chatId,
      message_id: processingMsg.message_id
    }
  );
});

console.log('🤖 Бот запущен и ждет сообщения...');

// Экспортируем функцию для внешнего использования
module.exports = { sendBroadcastMessage }; 