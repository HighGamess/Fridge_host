import { retrieveLaunchParams } from '@telegram-apps/sdk';

const { initDataRaw } = retrieveLaunchParams();
console.log(initDataRaw);

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

async function setJwtAndSubmit() {
  try {
    const jwt = await getJwtFromServer();
    const jwtInput = document.getElementById('jwt');

    if (jwtInput) {
      jwtInput.value = jwt;
      document.getElementById('jwtSenderForm').submit();
    } else {
      console.error('Элемент с id "jwt" не найден на странице.');
    }
  } catch (error) {
    console.error('Ошибка при установке JWT и отправке формы:', error.message);
  }
}

setJwtAndSubmit();
