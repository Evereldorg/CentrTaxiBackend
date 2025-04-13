const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');

const CACHE_TTL = 5 * 60 * 1000; // 5 минут кеширования
let cachedData = null;
let lastFetched = 0;

const VK_API_URL = "https://api.vk.com/method/wall.get";
const GROUP_ID = process.env.VK_GROUP_ID || "-229422677";
const ACCESS_TOKEN = process.env.VK_SERVICE_TOKEN;
const API_VERSION = process.env.VK_API_VERSION || "5.199";

// Улучшенный мок для тестирования
const mockNews = {
  response: {
    items: [
      {
        id: 1,
        text: "Сервис временно недоступен. Приносим извинения за неудобства.",
        date: Date.now() / 1000,
        attachments: []
      }
    ]
  }
};

// Фильтр постов
function filterPosts(posts) {
  return posts.filter(post => {
    // Условия для важных новостей:
    const isImportant = 
      post.text && 
      post.text.trim().length > 30 && // Минимум 30 символов
      !post.text.includes('#реклама') && // Исключаем рекламу
      !post.text.startsWith('https://'); // Исключаем посты-ссылки

    return isImportant;
  });
}

async function fetchVKNews() {
  try {
    console.log(`[VK API] Загружаем посты для группы ${GROUP_ID}`);
    
    const params = new URLSearchParams({
      owner_id: GROUP_ID,
      count: '20', // Берем с запасом для фильтрации
      access_token: ACCESS_TOKEN,
      v: API_VERSION,
      extended: 1
    });

    const apiUrl = `${VK_API_URL}?${params}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.error(`Ошибка VK API: ${response.status}`);
      return mockNews;
    }

    const data = await response.json();
    
    if (data.error) {
      console.error('Ошибка VK:', data.error);
      return mockNews;
    }

    // Фильтруем посты
    if (data.response?.items) {
      data.response.items = filterPosts(data.response.items).slice(0, 5); // Оставляем 5 важных
    }

    return data;

  } catch (error) {
    console.error('Ошибка при запросе к VK:', error);
    return mockNews;
  }
}

// Остальной код (getNews, экспорт) остается без изменений
module.exports = { getNews };