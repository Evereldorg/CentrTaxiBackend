const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const CACHE_TTL = 5 * 60 * 1000;
let cachedData = null;
let lastFetched = 0;

const VK_API_URL = "https://api.vk.com/method/wall.get";
const GROUP_ID = process.env.VK_GROUP_ID || "-229422677";
const ACCESS_TOKEN = process.env.VK_SERVICE_TOKEN;
const API_VERSION = process.env.VK_API_VERSION || "5.199";

function processText(text) {
  if (!text) return '';

  // Удаляем все хештеги (включая русские и с подчеркиваниями)
  let processed = text.replace(/#[а-яА-ЯёЁa-zA-Z0-9_]+/g, '');
  
  // Обрабатываем URL-ссылки
  processed = processed.replace(
    /(https?:\/\/[^\s]+)/g, 
    (url) => `[LINK:${url}]`
  );
  
  // Удаляем лишние переносы строк
  processed = processed.replace(/\n{3,}/g, '\n\n');
  
  return processed.trim();
}

function hasPhotoAttachment(attachments) {
  return attachments && attachments.some(a => a.type === 'photo');
}

async function fetchVKNews() {
  try {
    const params = new URLSearchParams({
      owner_id: GROUP_ID,
      count: '20',
      access_token: ACCESS_TOKEN,
      v: API_VERSION,
      extended: 1
    });

    const response = await fetch(`${VK_API_URL}?${params}`);
    const data = await response.json();

    if (data.response?.items) {
      data.response.items = data.response.items
        .filter(post => !post.is_pinned) // Удаляем закрепленные посты
        .filter(post => post.text && post.text.trim().length > 30) // Только посты с текстом
        .filter(post => hasPhotoAttachment(post.attachments)) // Только посты с фото
        .map(post => ({
          ...post,
          // Оставляем только фото-вложения
          attachments: post.attachments?.filter(a => a.type === 'photo'),
          text: processText(post.text),
          rawText: post.text // Сохраняем оригинальный текст
        }))
        .slice(0, 5); // Берем первые 5 постов
    }

    return data;
  } catch (error) {
    console.error('VK API error:', error);
    return { response: { items: [] } };
  }
}

async function getNews() {
  const now = Date.now();
  if (cachedData && now - lastFetched < CACHE_TTL) return cachedData;

  try {
    const data = await fetchVKNews();
    cachedData = data;
    lastFetched = now;
    return data;
  } catch (error) {
    console.error('Cache error:', error);
    return { response: { items: [] } };
  }
}

module.exports = { getNews };