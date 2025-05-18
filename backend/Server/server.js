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
const botSecretKey = process.env.TELEGRAM_BOT_TOKEN;

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

const corsOptions = {
  origin: "*", 
  methods: ["GET", "POST", "OPTIONS"], 
  allowedHeaders: ["Authorization", "Content-Type"], 
  credentials: true,
};

server.use(cors());
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

server.options("*", cors());
server.get("/GetJwt", (req, res) => {
  try {
    const authorizationHeader = req.headers["authorization"];
    const botSecretKey = process.env.TELEGRAM_BOT_TOKEN;

    const { authData, hash } = parseAuthorizationHeader(authorizationHeader);
    const validatedHash = validateAuth(authData, botSecretKey, hash);

    const userJson = authData["user"];
    if (!userJson) {
      throw new Error("User data is missing");
    }

    const user = JSON.parse(userJson);
    const userId = user.id;

    if (!userId) {
      throw new Error("User ID is missing");
    }

    const jwtToken = generateToken({ userId: userId });
    res.json({ jwt: jwtToken });
  } catch (err) {
    console.error("Validation error:", err.message);
    res.status(400).json({ error: err.message });
  }
});

function parseAuthorizationHeader(header) {
  if (!header) {
    throw new Error("Authorization header is missing");
  }

  const params = new URLSearchParams(header);

  const hash = params.get("hash");
  if (!hash) {
    throw new Error("Hash is missing in authorization header");
  }
  params.delete("hash");

  const authData = {};
  for (const [key, value] of params.entries()) {
    authData[key] = value;
  }

  return { authData, hash };
}

function validateAuth(authData, secret, signature) {
  const dataCheckArr = Object.entries(authData).map(
    ([key, value]) => `${key}=${value}`
  );

  dataCheckArr.sort();

  const dataCheckString = dataCheckArr.join("\n");

  const mac1 = crypto.createHmac("sha256", "WebAppData");
  mac1.update(secret);
  const intermediateKey = mac1.digest();

  const mac2 = crypto.createHmac("sha256", intermediateKey);
  mac2.update(dataCheckString);
  const calculatedSignature = mac2.digest("hex");

  if (calculatedSignature !== signature) {
    throw new Error(
      `Invalid auth signature. Expected: ${calculatedSignature}, Received: ${signature}`
    );
  }

  return calculatedSignature;
}

server.get("/auth", async (req, res) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(400).send("Authorization header is missing");
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, secretKey);
    const userId = decoded.userId;

    const query = "SELECT * FROM users WHERE user_id = $1";
    const users = await executeQuery(query, [userId]);

    if (users.length > 0) {
      res.status(200).json({ token });
    } else {
      const insertQuery = `
        INSERT INTO users (user_id, level, money)
        VALUES ($1, $2, $3)
        RETURNING *;
      `;
      await executeQuery(insertQuery, [userId, 0, 0]);

      res.status(201).json({ token });
    }
  } catch (err) {
    console.error("auth error:", err.message);
    res.status(500).send("Ошибка авторизации");
  }
});

server.get("/save", verifyToken, async (req, res) => {
  try {
    if (!req.query.saveData) {
      return res.status(400).send("Отсутствует параметр saveData.");
    }

    const saveData = JSON.parse(req.query.saveData);
    const userId = req.user.userId;

    if (typeof saveData.level !== "number" || typeof saveData.money !== "number") {
      return res.status(400).send("Неверный формат saveData. Поля 'level' и 'money' должны быть числами.");
    }

    const selectQuery = "SELECT level, money FROM users WHERE user_id = $1";
    const currentDataResult = await executeQuery(selectQuery, [userId]);

    if (currentDataResult.length === 0) {
      return res.status(404).send("Пользователь не найден.");
    }

    const currentLevel = currentDataResult[0].level;
    const currentMoney = currentDataResult[1].money;

    if (saveData.level <= currentLevel || saveData.level > currentLevel + 2) {
      return res.status(400).send("Неверное значение level. Оно должно быть больше текущего, но не более чем на 2.");
    }

    if (saveData.money > currentMoney + 2000) {
      return res.status(400).send("Неверное значение money. Нельзя увеличивать деньги более чем на 2000.");
    }

    const updateQuery = "UPDATE users SET level = $1, money = $2 WHERE user_id = $3";
    await executeQuery(updateQuery, [saveData.level, saveData.money, userId]);

    res.status(200).send("Данные успешно сохранены.");
  } catch (err) {
    console.error("Ошибка при обработке saveData:", err);
    res.status(500).send("Произошла ошибка при сохранении данных.");
  }
});

server.get("/load", verifyToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const query = "SELECT level, money FROM users WHERE user_id = $1";
    const result = await executeQuery(query, [userId]);

    console.log(`userID: ${userId}`);
    console.log(`user data: ${JSON.stringify(result, null, 2)}`);

    if (result.length > 0) {
      const userData = {
        level: result[0].level,
        money: result[1].money,
      };
    
      console.log(userData);
      res.status(200).json(userData); 
    } else {
      res.status(404).send("Данные пользователя не найдены.");
    }
  } catch (err) {
    console.error("Ошибка при загрузке данных:", err);
    res.status(500).send("Произошла ошибка при загрузке данных.");
  }
});

server.get("/healthcheck", (req, res) => {
  res.status(200).json({ status: "OK", message: "Service is healthy" });
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
