import { test as base } from '@playwright/test';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { UserClient } from '../clients/UserClient';
import { CleanupService } from '../support/CleanupService';

/**
 * Fixtures Unificadas.
 * Centraliza a injeção de dependências e gerenciamento de estado dos testes.
 */

type MyFixtures = {
  registerPage: RegisterPage;
  loginPage: LoginPage;
  userClient: UserClient;
  cleanupService: CleanupService;
};

export const test = base.extend<MyFixtures>({
  // Fixture de Serviço de Limpeza (Teardown Automático)
  cleanupService: async ({}, use) => {
    const service = new CleanupService();
    await use(service);
    await service.cleanup(); // Executa a limpeza após cada teste
  },

  // Fixture de API Client (Independente do baseURL do projeto)
  userClient: async ({ playwright }, use) => {
    const apiRequest = await playwright.request.newContext({
      baseURL: process.env.API_URL || 'http://localhost:3000',
    });
    await use(new UserClient(apiRequest));
    await apiRequest.dispose();
  },

  // Fixture de Page Object
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});

export { expect } from '@playwright/test';
