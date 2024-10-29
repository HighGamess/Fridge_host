const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { Client } = require('pg');

const server = express();
const port = process.env.PORT || 3000;
const secretKey = "your_secret_key"; // Храните это в надежном месте

const client = new Client({
    user: 'postgres',
    host: 'fridge.ctspxwciisx9.us-west-2.rds.amazonaws.com',
    database: 'fridge',
    password: 'sz0x9GIcQWIft7lh',
    port: 5432,
    ssl: {
        rejectUnauthorized: false
    }
});

client.connect()
    .then(() => console.log('Connected to PostgreSQL'))
    .catch(err => console.error('Connection error', err.stack));

// Метод для выполнения запросов
async function executeQuery(query, params = []) {
    try {
        const res = await client.query(query, params);
        return res.rows;
    } catch (err) {
        console.error('Error executing query:', err.stack);
        throw err;
    }
}

server.use(cors()); // Добавляем CORS middleware
server.use(express.json());
server.use(express.static(path.join(__dirname, "FridgeHost")));

// Генерация JWT
function generateToken(tgId) {
    return jwt.sign({ tgId }, secretKey, { expiresIn: '1h' });
}

// Верификация JWT
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    console.log("Received Token:", token); // Логируем токен для проверки

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

// Эндпоинт для аутентификации
server.get("/auth", async (req, res) => {
    const tgId = req.query.tgId;
    const query = 'SELECT * FROM users WHERE telegram_id = $1';
    const params = [tgId];

    try {
        const users = await executeQuery(query, params);
        if (users.length > 0) {
            const token = generateToken(tgId);
            res.status(200).json({ token });
        } else {
            const defaultData = JSON.stringify({ level: 0, money: 0 });
            const insertQuery = 'INSERT INTO users (telegram_id, save_data) VALUES ($1, $2) RETURNING *';
            const newUser = await executeQuery(insertQuery, [tgId, defaultData]);
            const token = generateToken(tgId);
            res.status(201).json({ token });
        }
    } catch (err) {
        res.status(500).send("Error occurred during authorization.");
    }
});

// Эндпоинт для сохранения игры
server.get("/save", verifyToken, async (req, res) => {
    const saveData = JSON.parse(req.query.saveData); // Парсим значение saveData
    const tgId = req.query.tgId;
    const query = 'SELECT * FROM users WHERE telegram_id = $1';
    const params = [tgId];
    console.log(saveData)

    try {
        const users = await executeQuery(query, params);
        if (users.length > 0) {
            const updateQuery = 'UPDATE users SET save_data = $2 WHERE telegram_id = $1';
            await executeQuery(updateQuery, [tgId, JSON.stringify(saveData)]);
            res.status(200).send("Game saved successfully.");
        } else {
            res.status(404).send("User not found.");
        }
    } catch (err) {
        res.status(500).send("Error occurred during saving.");
    }
});

// Эндпоинт для загрузки игры
server.get("/load", verifyToken, async (req, res) => {
    const { tgId } = req.query;
    const query = 'SELECT save_data FROM users WHERE telegram_id = $1';
    const params = [tgId];

    try {
        const users = await executeQuery(query, params);
        if (users.length > 0) {
            res.status(200).json(users[0].save_data);
        } else {
            res.status(404).send("User not found.");
        }
    } catch (err) {
        res.status(500).send("Error occurred during loading.");
    }
});

server.listen(port, function () {
    console.log(`Server is running on port ${port}`);
});
