const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');

const CACHE_TTL = 1 * 60 * 1000; // 1 minute cache
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
    console.log(`[VK API] Fetching news for group ${GROUP_ID}`);
    
    const params = new URLSearchParams({
      owner_id: GROUP_ID,
      count: '5',
      access_token: ACCESS_TOKEN,
      v: API_VERSION,
      // filter: 'owner', // Removed as it might limit posts
      offset: 0 // Fixed offset instead of random
    });

    const apiUrl = `${VK_API_URL}?${params}`;
    console.log(`[VK API] Request URL: ${apiUrl.replace(ACCESS_TOKEN, 'REDACTED')}`);

    const response = await fetch(apiUrl);
    console.log(`[VK API] Response status: ${response.status}`);

    if (!response.ok) {
      console.error(`[VK API] HTTP error: ${response.status}`);
      return mockNews;
    }

    const data = await response.json();
    console.log('[VK API] Response data:', JSON.stringify(data, null, 2));

    if (data.error) {
      console.error('[VK API] Error:', data.error);
      return mockNews;
    }

    return data;

  } catch (error) {
    console.error('[VK API] Fetch error:', error);
    return mockNews;
  }
}

async function getNews() {
  const now = Date.now();

  // Log cache status
  console.log(`[Cache] Check - now: ${now}, lastFetched: ${lastFetched}, TTL: ${CACHE_TTL}`);
  
  if (cachedData && now - lastFetched < CACHE_TTL) {
    console.log('[Cache] Using cached data');
    return cachedData;
  }

  try {
    console.log('[Cache] Fetching fresh data');
    const data = await fetchVKNews();
    
    if (data?.response?.items) {
      console.log(`[Cache] Received ${data.response.items.length} items`);
      cachedData = data;
      lastFetched = now;
      
      try {
        fs.writeFileSync("newsCache.json", JSON.stringify(data));
        console.log('[Cache] Saved to file');
      } catch (e) {
        console.error('[Cache] File write error:', e);
      }
    } else {
      console.error('[Cache] Invalid data structure:', data);
    }
    
    return data;
  } catch (error) {
    console.error('[Cache] Get news error:', error);
    
    // Fallback to file cache
    if (fs.existsSync("newsCache.json")) {
      try {
        console.log('[Cache] Trying to read from file cache');
        const fileData = JSON.parse(fs.readFileSync("newsCache.json", "utf8"));
        return fileData;
      } catch (e) {
        console.error('[Cache] File read error:', e);
      }
    }
    
    console.log('[Cache] Using mock news');
    return mockNews;
  }
}

module.exports = { getNews };