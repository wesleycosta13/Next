import { test as baseTest } from '@playwright/test';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { deleteUserByEmail } from '../utils/dbHelper';

// Define os tipos das fixtures que estarão disponíveis nos testes
export type MyFixtures = {
  registerPage: RegisterPage;
  testData: { emailCriado?: string }; // Guarda o estado para o teardown
};

export const test = baseTest.extend<MyFixtures>({
  
  // Fixture para compartilhamento de estado de dados do teste
  testData: async ({}, use) => {
    const data: { emailCriado?: string } = { emailCriado: undefined };
    await use(data); // O teste roda aqui

    // TEARDOWN AUTOMÁTICO E ISOLADO!
    if (data.emailCriado) {
      await deleteUserByEmail(data.emailCriado);
    }
  },

  // Fixture da RegisterPage (Injeta automaticamente nos testes)
  registerPage: async ({ page }, use) => {
    const registerPage = new RegisterPage(page);
    await use(registerPage);
  },
});

export { expect } from '@playwright/test';
