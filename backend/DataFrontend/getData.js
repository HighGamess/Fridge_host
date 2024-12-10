import { retrieveLaunchParams } from '@telegram-apps/sdk';

const { initDataRaw } = retrieveLaunchParams();

async function GetJwtFromServer() {
  const response = await fetch(`http://localhost:3000/GetJwt`, {
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
}

async function setJwtAndSubmit() {
  try {
    const jwt = await GetJwtFromServer();

    document.getElementById("jwt").value = jwt;
    document.getElementById("jwtSenderForm").submit();
  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

setJwtAndSubmit();
