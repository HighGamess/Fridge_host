require('dotenv').config(); // Загрузка переменных окружения

const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { Client } = require('pg');
const crypto = require('crypto');

const server = express();
const port = process.env.PORT || 3000;
const secretKey = process.env.JWT_SECRET;
const botToken = process.env.TELEGRAM_BOT_TOKEN;

const client = new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DATABASE,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});

client.connect()
    .then(() => console.log('Connected to PostgreSQL'))
    .catch(err => console.error('Connection error', err.stack));

async function executeQuery(query, params = []) {
    try {
        const res = await client.query(query, params);
        return res.rows;
    } catch (err) {
        console.error('Error executing query:', err.stack);
        throw err;
    }
}

server.use(cors());
server.use(express.json());
server.use(express.static(path.join(__dirname, "FridgeHost")));

function generateToken(tgId) {
    return jwt.sign({ tgId }, secretKey, { expiresIn: '1h' });
}

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

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

function validateTelegramData(data) {
    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const checkString = Object.keys(data)
        .filter(key => key !== 'hash')
        .map(key => `${key}=${data[key]}`)
        .sort()
        .join('\n');
    const hash = crypto.createHmac('sha256', secretKey)
        .update(checkString)
        .digest('hex');
    return hash === data.hash;
}

server.get("/auth", async (req, res) => {
    const initData = req.query.initData;
    const data = Object.fromEntries(new URLSearchParams(initData));

    if (!validateTelegramData(data)) {
        return res.status(403).send("Invalid Telegram data");
    }

    const tgId = data.id;
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

server.get("/save", verifyToken, async (req, res) => {
    const saveData = req.query.saveData;
    const tgId = req.user.tgId;

    const query = 'SELECT * FROM users WHERE telegram_id = $1';
    const params = [tgId];

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

server.get("/load", verifyToken, async (req, res) => {
    const tgId = req.user.tgId;
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
