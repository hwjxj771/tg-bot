const TelegramBot = require('node-telegram-bot-api');
const { Pool } = require('pg');

// Твой токен бота
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const GAME_URL = 'https://t.me/gift_run_bot/tgiftiF12QIDdag';

// Подключение к базе данных
const pool = new Pool({
  connectionString: "postgresql://postgres:XxYjmVHUnYwiOGusWfjLCPajPtwVKLkM@postgres.railway.internal:5432/railway",
  ssl: false
});

// ТВОЙ АЙДИ - только ты имеешь доступ к командам
const ADMIN_IDS = [7002066167];

// Проверка прав доступа
function isAdmin(chatId) {
  return ADMIN_IDS.includes(chatId);
}

// Инициализация базы данных
async function initDatabase() {
  try {
    const client = await pool.connect();
    console.log('✅ Подключение к базе данных успешно');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        chat_id BIGINT PRIMARY KEY,
        username VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Таблица users готова');
    client.release();
  } catch (error) {
    console.error('❌ Ошибка базы данных:', error.message);
  }
}

// Добавляем пользователя с username
async function addUser(chatId, userInfo = {}) {
  try {
    const { username, first_name, last_name } = userInfo;
    await pool.query(
      `INSERT INTO users (chat_id, username, first_name, last_name) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (chat_id) 
       DO UPDATE SET 
         username = EXCLUDED.username,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name`,
      [chatId, username, first_name, last_name]
    );
    console.log(`✅ Пользователь добавлен: ${username || chatId}`);
    return true;
  } catch (error) {
    console.error('❌ Ошибка добавления пользователя:', error.message);
    return false;
  }
}

// Получаем всех пользователей
async function getAllUsers() {
  try {
    const result = await pool.query('SELECT chat_id, username FROM users');
    console.log(`📊 Найдено пользователей в базе: ${result.rows.length}`);
    return result.rows.map(row => ({
      chatId: row.chat_id,
      username: row.username
    }));
  } catch (error) {
    console.error('❌ Ошибка получения пользователей:', error.message);
    return [];
  }
}

// Получаем количество пользователей
async function getUserCount() {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('❌ Ошибка подсчета пользователей:', error.message);
    return 0;
  }
}

// Инициализируем базу данных при запуске
initDatabase();

// Команда для получения chatId (ТОЛЬКО для админа)
bot.onText(/\/myid/, async (msg) => {
  const chatId = msg.chat.id;
  
  if (!isAdmin(chatId)) {
    return bot.sendMessage(chatId, '❌ У вас нет прав для этой команды.');
  }
  
  const userCount = await getUserCount();
  bot.sendMessage(chatId, `📊 Ваш chatId: ${chatId}\n👥 Всего пользователей в базе: ${userCount}`);
  console.log(`Админ запросил ID: ${chatId}`);
});

// Команда для проверки базы данных (ТОЛЬКО для админа)
bot.onText(/\/checkdb/, async (msg) => {
  const chatId = msg.chat.id;
  
  if (!isAdmin(chatId)) {
    return bot.sendMessage(chatId, '❌ У вас нет прав для этой команды.');
  }
  
  try {
    const userCount = await getUserCount();
    const allUsers = await getAllUsers();
    
    let userList = '📋 Список пользователей:\n\n';
    allUsers.forEach((user, index) => {
      userList += `${index + 1}. @${user.username || 'без username'} (${user.chatId})\n`;
    });
    
    bot.sendMessage(chatId, `✅ База данных работает\n👥 Всего пользователей: ${userCount}\n\n${userList}`);
  } catch (error) {
    bot.sendMessage(chatId, `❌ Ошибка базы: ${error.message}`);
  }
});

// Основная команда /start (доступна всем)
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userInfo = msg.from;
  
  console.log(`Новый пользователь: ${userInfo.username || 'без username'} (${chatId})`);
  
  // Сохраняем в базу с username
  await addUser(chatId, userInfo);
  const userCount = await getUserCount();
  
  console.log(`Всего пользователей: ${userCount}`);
  
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
  
  for (const user of allUsers) {
    try {
      await bot.sendMessage(user.chatId, message, {
        reply_markup: keyboard
      });
      successCount++;
      console.log(`✅ Отправлено пользователю: @${user.username || user.chatId}`);
      
      // Задержка
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Ошибка пользователю @${user.username || user.chatId}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`✅ Рассылка завершена! Успешно: ${successCount}, Ошибок: ${errorCount}`);
  return { successCount, errorCount, totalUsers: allUsers.length };
}

// Команда для рассылки (ТОЛЬКО для админа)
bot.onText(/\/broadcast/, async (msg) => {
  const chatId = msg.chat.id;
  
  if (!isAdmin(chatId)) {
    return bot.sendMessage(chatId, '❌ У вас нет прав для этой команды.');
  }
  
  console.log(`Запуск рассылки администратором: ${chatId}`);
  
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

// Команда статистики (ТОЛЬКО для админа)
bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  
  if (!isAdmin(chatId)) {
    return bot.sendMessage(chatId, '❌ У вас нет прав для этой команды.');
  }
  
  const userCount = await getUserCount();
  bot.sendMessage(chatId, `📊 Статистика бота:\n\n👥 Всего пользователей: ${userCount}\n🆔 Ваш ID: ${chatId}`);
});

console.log('🤖 Бот запущен и ждет сообщения...');
console.log('👑 Администратор:', ADMIN_IDS[0]);