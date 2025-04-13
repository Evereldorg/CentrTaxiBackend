const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');

const CACHE_TTL = 5 * 60 * 1000; // 5 минут кеширования
let cachedData = null;
let lastFetched = 0;

const VK_API_URL = "https://api.vk.com/method/wall.get";
const GROUP_ID = process.env.VK_GROUP_ID || "-229422677";
const ACCESS_TOKEN = process.env.VK_SERVICE_TOKEN;
const API_VERSION = process.env.VK_API_VERSION || "5.199";

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

async function fetchVKNews() {
  try {
    console.log(`[VK API] Загружаем посты для группы ${GROUP_ID}`);
    
    const params = new URLSearchParams({
      owner_id: GROUP_ID,
      count: '20',
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

    if (data.response?.items) {
      // Фильтруем посты: оставляем только важные новости
      data.response.items = data.response.items.filter(post => {
        const hasText = post.text && post.text.trim().length > 30;
        const isImportant = !post.text.includes('#реклама') && !post.text.startsWith('https://');
        return hasText && isImportant;
      }).slice(0, 5); // Берем 5 самых свежих
    }

    return data;

  } catch (error) {
    console.error('Ошибка при запросе к VK:', error);
    return mockNews;
  }
}

async function getNews() {
  const now = Date.now();

  // Используем кеш, если он актуален
  if (cachedData && now - lastFetched < CACHE_TTL) {
    console.log('[Cache] Используем кешированные данные');
    return cachedData;
  }

  try {
    console.log('[Cache] Загружаем свежие данные');
    const data = await fetchVKNews();
    
    if (data?.response?.items) {
      console.log(`[Cache] Получено ${data.response.items.length} записей`);
      cachedData = data;
      lastFetched = now;
      
      // Сохраняем в файл для резервного копирования
      try {
        fs.writeFileSync("newsCache.json", JSON.stringify(data));
        console.log('[Cache] Данные сохранены в файл');
      } catch (e) {
        console.error('[Cache] Ошибка записи в файл:', e);
      }
    }
    
    return data;
  } catch (error) {
    console.error('[Cache] Ошибка при получении новостей:', error);
    
    // Пробуем загрузить из файлового кеша
    if (fs.existsSync("newsCache.json")) {
      try {
        console.log('[Cache] Пробуем загрузить из файлового кеша');
        const fileData = JSON.parse(fs.readFileSync("newsCache.json", "utf8"));
        return fileData;
      } catch (e) {
        console.error('[Cache] Ошибка чтения файла:', e);
      }
    }
    
    console.log('[Cache] Используем моковые данные');
    return mockNews;
  }
}

module.exports = { getNews };