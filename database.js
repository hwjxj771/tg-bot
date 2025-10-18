const { Pool } = require('pg');

// Подключаемся к базе данных
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Создаем таблицу если ее нет
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

// Добавляем пользователя
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

// Получаем всех пользователей
async function getAllUsers() {
  try {
    const result = await pool.query('SELECT chat_id FROM users');
    return result.rows.map(row => row.chat_id);
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    return [];
  }
}

// Получаем количество пользователей
async function getUserCount() {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Ошибка подсчета пользователей:', error);
    return 0;
  }
}

// Удаляем пользователя (если заблокировал бота)
async function removeUser(chatId) {
  try {
    await pool.query('DELETE FROM users WHERE chat_id = $1', [chatId]);
    return true;
  } catch (error) {
    console.error('Ошибка удаления пользователя:', error);
    return false;
  }
}

module.exports = {
  initDatabase,
  addUser,
  getAllUsers,
  getUserCount,
  removeUser
};