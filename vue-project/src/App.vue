<template>
  <div>
    <h1>Get Telegram Data</h1>
    <!-- Скрытая форма -->
    <form 
      ref="jwtSenderForm" 
      method="POST" 
      :action="formAction"
    >
      <input type="hidden" id="jwt" name="jwt" :value="jwt" />
    </form>
  </div>
</template>

<script>
import { retrieveLaunchParams } from '@telegram-apps/sdk';

export default {
  data() {
    return {
      jwt: '', // JWT, который будет получен с сервера
      formAction: 'https://spectacular-sherbet-31ce64.netlify.app', // URL назначения формы
      initDataRaw: '', // Telegram initData
    };
  },
  async mounted() {
    // Получение параметров запуска Telegram
    const { initDataRaw } = retrieveLaunchParams();
    this.initDataRaw = initDataRaw;
    console.log('initDataRaw:', this.initDataRaw);

    // Получение JWT и отправка формы
    await this.setJwtAndSubmit();
  },
  methods: {
    async getJwtFromServer() {
      try {
        const response = await fetch('http://localhost:3000/GetJwt', {
          method: 'GET',
          headers: {
            Authorization: this.initDataRaw,
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
    async setJwtAndSubmit() {
      try {
        // Получение JWT
        this.jwt = await this.getJwtFromServer();

        // Ссылка на форму
        const form = this.$refs.jwtSenderForm;

        if (form) {
          // Автоматическая отправка формы
          form.submit();
        } else {
          console.error('Форма не найдена');
        }
      } catch (error) {
        console.error('Ошибка при установке JWT и отправке формы:', error.message);
      }
    },
  },
};
</script>

<style>
/* Стили для оформления, если нужно */
</style>
