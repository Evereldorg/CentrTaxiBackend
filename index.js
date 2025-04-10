require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { getNews } = require("./vkNewsCache");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Роут для новостей
app.get("/api/news", async (req, res) => {
  try {
    const news = await getNews();
    res.json(news);
  } catch (error) {
    console.error("Ошибка получения новостей:", error);
    res.status(500).json({ 
      error: "Не удалось загрузить новости",
      details: error.message 
    });
  }
});

app.use(cors({
  origin: 'http://localhost:5173', // Укажите ваш фронтенд-адрес
  credentials: true
}));
// Статические файлы (если нужно)
app.use(express.static(path.join(__dirname, 'public')));

// Обработка 404
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
});