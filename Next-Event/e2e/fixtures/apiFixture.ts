import { test as baseTest, APIRequestContext, request } from '@playwright/test';
import { UserClient } from '../clients/UserClient';
import { deleteUserByEmail } from '../utils/dbHelper';

type ApiFixtures = {
  userClient: UserClient;
  testData: { emailCriado?: string };
};

export const apiTest = baseTest.extend<ApiFixtures>({
  userClient: async ({ request }, use) => {
    const userClient = new UserClient(request);
    await use(userClient);
  },
  testData: async ({}, use) => {
    // Objeto mutável para persistir estado dentro de um teste e limpá-lo no afterEach
    const data: { emailCriado?: string } = { emailCriado: undefined };
    await use(data);
    
    // TEARDOWN AUTOMÁTICO PARA API TAMBÉM
    if (data.emailCriado) {
      await deleteUserByEmail(data.emailCriado);
    }
  }
});

export { expect } from '@playwright/test';
