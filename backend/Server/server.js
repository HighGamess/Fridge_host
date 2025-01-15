require("dotenv").config();

const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { Client } = require("pg");
const crypto = require("crypto");

const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

const server = express();
const port = process.env.PORT || 3000;
const secretKey = process.env.JWT_SECRET;
const botSecretKey = process.env.BOT_SECRET_KEY;

console.log("POSTGRES_USER:", process.env.POSTGRES_USER);
console.log("POSTGRES_PASSWORD:", process.env.POSTGRES_PASSWORD);

const client = new Client({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DATABASE,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
  ssl: {
    rejectUnauthorized: false,
  },
});

client
  .connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch((err) => console.error("Connection error", err.stack));

async function executeQuery(query, params = []) {
  try {
    const res = await client.query(query, params);
    return res.rows;
  } catch (err) {
    console.error("Error executing query:", err.stack);
    throw err;
  }
}

// Настройка CORS
const corsOptions = {
  origin: "https://baby1-proxy-fridge-app-frontend-dev.dev.babyparrot.xyz", // Укажите ваш фронтенд-домен
  methods: ["GET", "POST", "OPTIONS"], // Разрешённые методы
  allowedHeaders: ["Authorization", "Content-Type"], // Разрешённые заголовки
  credentials: true, // Разрешить отправку cookies, если нужно
};

server.use(cors(corsOptions));
server.use(express.json());
server.use(express.static(path.join(__dirname, "FridgeHost")));

function generateToken(payload) {
  return jwt.sign(payload, secretKey, { expiresIn: "1h" });
}

function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(403).send("A token is required for authentication");
  }

  try {
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded;
  } catch (err) {
    return res.status(401).send("Invalid Token");
  }
  return next();
}

server.options("*", cors(corsOptions)); // Обработка preflight-запросов

server.get("/GetJwt", (req, res) => {
  const authorizationHeader = req.headers["authorization"];

  if (!authorizationHeader) {
    return res.status(400).json({ error: "Authorization header is missing" });
  }

  const initDataRaw = authorizationHeader;
  const initData = initDataRaw.replace(/tg_hash=[^&]*&?/, ""); // Удаляем tg_hash из initData
  const tgHash = authorizationHeader.match(/tg_hash=([^&]*)/)[1]; // Извлекаем tg_hash

  const computedHash = sha256(initData + botSecretKey); // Вычисляем хэш с bot_secret_key

  if (computedHash !== tgHash) {
    return res.status(401).json({ error: "Invalid hash" });
  }

  const jwtToken = generateToken({ hash: computedHash }); // Генерация JWT на основе данных

  res.json({ jwt: jwtToken });
});

// Использование JWT для авторизации
server.get("/auth", async (req, res) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(400).send("Authorization header is missing");
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, secretKey);
    const hash = decoded.hash; // Получаем хэш из декодированного токена

    const query = "SELECT * FROM users WHERE hash = $1";
    const params = [hash];

    const users = await executeQuery(query, params);
    if (users.length > 0) {
      res.status(200).json({ token });
    } else {
      const defaultData = JSON.stringify({ level: 0, money: 0 });
      const insertQuery =
        "INSERT INTO users (hash, save_data) VALUES ($1, $2) RETURNING *";
      await executeQuery(insertQuery, [hash, defaultData]);
      res.status(201).json({ token });
    }
  } catch (err) {
    res.status(500).send("Error occurred during authorization.");
  }
});

server.get("/save", verifyToken, async (req, res) => {
  const saveData = JSON.parse(req.query.saveData);
  const hash = req.user.hash;

  try {
    const updateQuery = "UPDATE users SET save_data = $1 WHERE hash = $2";
    await executeQuery(updateQuery, [JSON.stringify(saveData), hash]);
    res.status(200).send("Data saved successfully.");
  } catch (err) {
    res.status(500).send("Error occurred while saving data.");
  }
});

server.get("/load", verifyToken, async (req, res) => {
  const hash = req.user.hash;

  try {
    const query = "SELECT save_data FROM users WHERE hash = $1";
    const result = await executeQuery(query, [hash]);

    if (result.length > 0) {
      res.status(200).json({ saveData: result[0].save_data });
    } else {
      res.status(404).send("User data not found.");
    }
  } catch (err) {
    res.status(500).send("Error occurred while loading data.");
  }
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
