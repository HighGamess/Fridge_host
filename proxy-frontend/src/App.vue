<template>
  <div>
    <h1>Авторизация через Telegram</h1>
    <p v-if="loading">Пожалуйста, подождите. Выполняется авторизация...</p>
    <p v-if="error">{{ error }}</p>
  </div>
</template>

<script>
import { retrieveLaunchParams } from "@telegram-apps/sdk";

export default {
  data() {
    return {
      loading: true, // Состояние загрузки
      error: null, // Текст ошибки
    };
  },
  async mounted() {
    try {
      const { initDataRaw } = retrieveLaunchParams(); // Получаем данные Telegram
      const jwt = await this.getJwtFromServer(initDataRaw); // Получаем JWT с сервера
      this.redirectWithJwt(jwt); // Выполняем переадресацию
    } catch (error) {
      console.error("Ошибка:", error.message);
      this.error =
        "Произошла ошибка при авторизации. Пожалуйста, обновите страницу.";
      this.loading = false; // Завершаем загрузку
    }
  },
  methods: {
    async getJwtFromServer(initDataRaw) {
      try {
        // Настраиваем запрос с явным указанием `cors`
        const response = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/GetJwt`,
          {
            method: "GET",
            headers: {
              Authorization: initDataRaw,
              "Content-Type": "application/json", // Явно указываем тип данных
            },
            mode: "cors", // Включаем поддержку CORS
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Ошибка при получении JWT: ${response.status} - ${errorText}`
          );
        }

        const data = await response.json();
        return data.jwt;
      } catch (error) {
        console.error("Ошибка при получении JWT:", error.message);
        throw error;
      }
    },
    redirectWithJwt(jwt) {
      const redirectUrl = `${import.meta.env.VITE_GAME_URL}?jwt=${jwt}`;
      window.location.href = redirectUrl; // Выполняем переадресацию
    },
  },
};
</script>

<style>
h1 {
  text-align: center;
  margin-top: 50px;
}

p {
  text-align: center;
  font-size: 18px;
  color: #333;
}

p.error {
  color: red;
}
</style>
