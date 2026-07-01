import { test as base } from '@playwright/test';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/bolsista/DashboardPage';
import { MeusCertificadosPage } from '../pages/bolsista/MeusCertificadosPage';
import { AvaliacaoTutoriaPage } from '../pages/bolsista/AvaliacaoTutoriaPage';
import { TutorPage } from '../pages/tutor/TutorPage';
import { CoordenadorPage } from '../pages/coordenador/CoordenadorPage';
import { UserClient } from '../clients/UserClient';
import { CertificateClient } from '../clients/CertificateClient';
import { AvaliacaoClient } from '../clients/AvaliacaoClient';
import { CleanupService, globalCleanupService } from '../support/CleanupService';
import { ensureBackendReady } from '../support/backendHelper';

/**
 * Fixtures Unificadas.
 * Centraliza a injeção de dependências e gerenciamento de estado dos testes.
 */

type MyFixtures = {
  registerPage: RegisterPage;
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  meusCertificadosPage: MeusCertificadosPage;
  avaliacaoTutoriaPage: AvaliacaoTutoriaPage;
  tutorPage: TutorPage;
  coordenadorPage: CoordenadorPage;
  userClient: UserClient;
  certificateClient: CertificateClient;
  avaliacaoClient: AvaliacaoClient;
  cleanupService: CleanupService;
};

export const test = base.extend<MyFixtures>({
  // Fixture de Serviço de Limpeza (Teardown Automático)
  cleanupService: async ({}, use) => {
    const service = globalCleanupService;
    await use(service);
  },

  // Fixtures de API Clients
  userClient: async ({ playwright }, use) => {
    await ensureBackendReady();
    const apiRequest = await playwright.request.newContext({
      baseURL: process.env.API_URL || 'http://127.0.0.1:3000',
    });
    await use(new UserClient(apiRequest));
    await apiRequest.dispose();
  },

  certificateClient: async ({ playwright }, use) => {
    await ensureBackendReady();
    const apiRequest = await playwright.request.newContext({
      baseURL: process.env.API_URL || 'http://127.0.0.1:3000',
    });
    await use(new CertificateClient(apiRequest));
    await apiRequest.dispose();
  },

  avaliacaoClient: async ({ playwright }, use) => {
    await ensureBackendReady();
    const apiRequest = await playwright.request.newContext({
      baseURL: process.env.API_URL || 'http://127.0.0.1:3000',
    });
    await use(new AvaliacaoClient(apiRequest));
    await apiRequest.dispose();
  },

  // Fixtures de Page Objects
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  meusCertificadosPage: async ({ page }, use) => {
    await use(new MeusCertificadosPage(page));
  },

  avaliacaoTutoriaPage: async ({ page }, use) => {
    await use(new AvaliacaoTutoriaPage(page));
  },

  tutorPage: async ({ page }, use) => {
    await use(new TutorPage(page));
  },

  coordenadorPage: async ({ page }, use) => {
    await use(new CoordenadorPage(page));
  },
});

export { expect } from '@playwright/test';
