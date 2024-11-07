const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { Client } = require('pg');

const server = express();
const port = 3000;
const secretKey = process.env.JWT_SECRET 

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
    console.log("Received Token:", token);

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

server.get("/auth", async (req, res) => {
    // Это не безопасно, можно подставить любой userId и авторизоваться под дургим пользателем
    // дальше с jwt ходить и делать все что угодно, чтобы такого небыло придумали авторизацию в телеграме
    // в init_data есть поле hash
    // ---
    // data_check_string = ...
    // secret_key = HMAC_SHA256(<bot_token>, "WebAppData")
    // if (hex(HMAC_SHA256(data_check_string, secret_key)) == hash) {
    // }
    // ---

    // data_check_string это hashmap (словарь), где лежат данные описанные в https://core.telegram.org/bots/webapps#webappinitdata 
    // с этих данных ты вырезаешь hash, кладешь в отедльную переменую
    // после прокидываешь hex(HMAC_SHA256(data_check_string, secret_key)) == hash) 
    // где hash это отложенный нами hash 

    // из init_data https://core.telegram.org/bots/webapps#webappinitdata
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

server.get("/save", verifyToken, async (req, res) => {

    const saveData = JSON.parse(req.query.saveData);
    //verifyToken - я так понимаю это jwt токен, но ты его не используешь, а берешь данные с query запроса
    // это супер мега небезопасно 
    const tgId = req.query.tgId;
    // 
    const query = 'SELECT * FROM users WHERE telegram_id = $1';
    const params = [tgId];
    // убери лог
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

server.get("/load", verifyToken, async (req, res) => {
    //verifyToken - я так понимаю это jwt токен, но ты его не используешь, а берешь данные с query запроса
    // это супер мега небезопасно 
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
