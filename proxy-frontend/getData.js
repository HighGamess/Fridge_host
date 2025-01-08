// Импорт функции для получения данных Telegram
import { retrieveLaunchParams } from '@telegram-apps/sdk';

// Получение данных запуска Telegram
const { initDataRaw } = retrieveLaunchParams();

// Функция для получения JWT с сервера
async function getJwtFromServer() {
  try {
    const response = await fetch('http://localhost:3000/GetJwt', {
      method: 'GET',
      headers: {
        Authorization: `${initDataRaw}`,
      },
    });

    if (!response.ok) {
      throw new Error('Ошибка при получении JWT с сервера');
    }

    const data = await response.json();
    return data.jwt;
  } catch (error) {
    console.error('Ошибка:', error.message);
    throw error;
  }
}

// Функция для получения JWT и выполнения переадресации
async function setJwtAndRedirect() {
  try {
    const jwt = await getJwtFromServer();

    // URL для переадресации
    const redirectUrl = `https://spectacular-sherbet-31ce64.netlify.app?jwt=${jwt}`;

    // Выполнение переадресации
    window.location.href = redirectUrl;
  } catch (error) {
    console.error('Ошибка при переадресации с JWT:', error.message);
  }
}

// Выполнение кода при загрузке страницы
window.onload = () => setJwtAndRedirect();
