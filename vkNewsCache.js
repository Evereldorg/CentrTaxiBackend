const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');

const CACHE_TTL = 15 * 60 * 1000;
let cachedData = null;
let lastFetched = 0;

const VK_API_URL = "https://api.vk.com/method/wall.get";
const GROUP_ID = process.env.VK_GROUP_ID || "-230030577";
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
    const params = new URLSearchParams({
      owner_id: GROUP_ID,
      count: '5',
      access_token: ACCESS_TOKEN,
      v: API_VERSION,
      filter: 'owner'
    });

    const response = await fetch(`${VK_API_URL}?${params}`);
    
    if (!response.ok) return mockNews;

    const data = await response.json();
    return data.error ? mockNews : data;
  } catch (error) {
    console.error('Fetch VK News Error:', error);
    return mockNews;
  }
}

async function getNews() {
  const now = Date.now();

  if (cachedData && now - lastFetched < CACHE_TTL) {
    return cachedData;
  }

  try {
    const data = await fetchVKNews();
    
    if (data?.response) {
      cachedData = data;
      lastFetched = now;
      fs.writeFileSync("newsCache.json", JSON.stringify(data));
    }
    
    return data;
  } catch (error) {
    console.error('Get News Error:', error);
    
    if (fs.existsSync("newsCache.json")) {
      try {
        return JSON.parse(fs.readFileSync("newsCache.json", "utf8"));
      } catch (e) {
        console.error('Cache read error:', e);
      }
    }
    
    return mockNews;
  }
}

module.exports = { getNews };