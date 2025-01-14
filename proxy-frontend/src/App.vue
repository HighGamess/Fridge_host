<template>
  <div>
    <h1>Авторизация через Telegram</h1>
    <p v-if="loading">Пожалуйста, подождите. Выполняется авторизация...</p>
    <p v-else>Произошла ошибка. Пожалуйста, обновите страницу.</p>
  </div>
</template>

<script>
import { retrieveLaunchParams } from '@telegram-apps/sdk';

export default {
  data() {
    return {
      loading: true, // Показываем сообщение загрузки
    };
  },
  async mounted() {
    try {
      const { initDataRaw } = retrieveLaunchParams(); // Получаем данные Telegram
      const jwt = await this.getJwtFromServer(initDataRaw); // Получаем JWT с сервера
      this.redirectWithJwt(jwt); // Выполняем переадресацию
    } catch (error) {
      console.error('Ошибка:', error.message);
      this.loading = false; // Показываем сообщение об ошибке
    }
  },
  methods: {
    async getJwtFromServer(initDataRaw) {
      try {
        const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/GetJwt`, { // Используем переменную окружения
          method: 'GET',
          headers: {
            Authorization: initDataRaw,
          },
        });

        if (!response.ok) {
          throw new Error('Ошибка при получении JWT с сервера');
        }

        const data = await response.json();
        return data.jwt;
      } catch (error) {
        console.error('Ошибка при получении JWT:', error.message);
        throw error;
      }
    },
    redirectWithJwt(jwt) {
      const redirectUrl = `${import.meta.env.VITE_GAME_URL}?jwt=${jwt}`; // Используем переменную окружения
      window.location.href = redirectUrl; // Выполняем переадресацию
    },
  },
};
</script>

<style>
/* Стили для отображения текста */
h1 {
  text-align: center;
  margin-top: 50px;
}

p {
  text-align: center;
  font-size: 18px;
  color: #333;
}
</style>
