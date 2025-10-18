const TelegramBot = require('node-telegram-bot-api');
const { Pool } = require('pg');

// Твой токен бота
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const GAME_URL = 'https://t.me/gift_run_bot/tgiftiF12QIDdag';

// Проверяем наличие DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL не найден! Проверь переменные окружения в Railway.');
}

// Настройка базы данных PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Простая функция для работы с базой (без сложных запросов)
async function initDatabase() {
  try {
    const client = await pool.connect();
    console.log('✅ Подключение к базе данных успешно');
    
    // Простая таблица
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        chat_id BIGINT PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Таблица users готова');
    client.release();
  } catch (error) {
    console.error('❌ Ошибка базы данных:', error.message);
  }
}

// Добавляем пользователя
async function addUser(chatId) {
  try {
    await pool.query(
      `INSERT INTO users (chat_id) VALUES ($1) ON CONFLICT (chat_id) DO NOTHING`,
      [chatId]
    );
    return true;
  } catch (error) {
    console.error('Ошибка добавления пользователя:', error.message);
    return false;
  }
}

// Получаем всех пользователей
async function getAllUsers() {
  try {
    const result = await pool.query('SELECT chat_id FROM users');
    console.log(`📊 Найдено пользователей в базе: ${result.rows.length}`);
    return result.rows.map(row => row.chat_id);
  } catch (error) {
    console.error('Ошибка получения пользователей:', error.message);
    return [];
  }
}

// Получаем количество пользователей
async function getUserCount() {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Ошибка подсчета пользователей:', error.message);
    return 0;
  }
}

// Инициализируем базу данных при запуске
initDatabase();

// ВРЕМЕННО: разрешаем всем запускать команды для тестирования
// Позже замени на свой chatId
const ADMIN_IDS = [7002066167];

// Команда для получения chatId
bot.onText(/\/myid/, async (msg) => {
  const chatId = msg.chat.id;
  const userCount = await getUserCount();
  bot.sendMessage(chatId, `📊 Ваш chatId: ${chatId}\n👥 Всего пользователей в базе: ${userCount}`);
  console.log(`ChatId пользователя: ${chatId}`);
});

// Команда для проверки базы данных
bot.onText(/\/checkdb/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const userCount = await getUserCount();
    const allUsers = await getAllUsers();
    bot.sendMessage(chatId, `✅ База работает\n👥 Пользователей: ${userCount}\n📝 Список: ${allUsers.join(', ')}`);
  } catch (error) {
    bot.sendMessage(chatId, `❌ Ошибка базы: ${error.message}`);
  }
});

// Основная команда /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  
  console.log(`Новый пользователь: ${chatId}`);
  
  // Пытаемся сохранить в базу
  const dbSuccess = await addUser(chatId);
  const userCount = await getUserCount();
  
  console.log(`Сохранение в базу: ${dbSuccess ? 'успешно' : 'ошибка'}, всего пользователей: ${userCount}`);
  
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
  
  if (allUsers.length === 0) {
    console.log('❌ Нет пользователей для рассылки');
    return { successCount: 0, errorCount: 0, totalUsers: 0 };
  }
  
  console.log(`📨 Начинаю рассылку для ${allUsers.length} пользователей...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const chatId of allUsers) {
    try {
      await bot.sendMessage(chatId, message, {
        reply_markup: keyboard
      });
      successCount++;
      console.log(`✅ Отправлено пользователю: ${chatId}`);
      
      // Задержка
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Ошибка пользователю ${chatId}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`✅ Рассылка завершена! Успешно: ${successCount}, Ошибок: ${errorCount}`);
  return { successCount, errorCount, totalUsers: allUsers.length };
}

// Команда для рассылки (ВРЕМЕННО для всех)
bot.onText(/\/broadcast/, async (msg) => {
  const chatId = msg.chat.id;
  
  console.log(`Запуск рассылки пользователем: ${chatId}`);
  
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
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'есть' : 'нет');