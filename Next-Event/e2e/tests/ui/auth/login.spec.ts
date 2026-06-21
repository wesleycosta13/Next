import { test, expect } from '../../../fixtures/index';
import { UserFactory } from '../../../support/factories/UserFactory';
import { buildUserPayload } from '../../../payloads/userPayload';

test.describe('UI - Login de Usuário', () => {

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.navigate();
  });

  test.describe('Fluxo Principal', () => {
    test('Deve logar com sucesso e redirecionar para a home do aluno @smoke', async ({ loginPage, userClient, cleanupService, page }) => {
      // 1. Setup via API (Garante que o usuário existe sem depender da UI de cadastro)
      const user = buildUserPayload();
      cleanupService.addEmail(user.email);
      await userClient.createUser(user);

      // 2. Ação na UI
      await loginPage.login(user.email, user.senha);

      // 3. Asserção de redirecionamento (Baseado no Login.jsx: student -> /aluno)
      await expect(page).toHaveURL(/\/aluno|bolsista|coordenador/);
    });

    test('Deve realizar logout com sucesso e retornar para a tela de login', async ({ loginPage, userClient, cleanupService, dashboardPage, page }) => {
      // 1. Criar um usuário via API
      const user = buildUserPayload();
      cleanupService.addEmail(user.email);
      await userClient.createUser(user);

      // 2. Fazer login
      await loginPage.login(user.email, user.senha);
      await expect(page).toHaveURL(/\/aluno|bolsista|coordenador/);

      // 3. Clicar no botão de Sair
      await dashboardPage.logout();
      await expect(page).toHaveURL(/\/$/); // Retorna para raiz (Login)
    });
  });

  test.describe('Feedback de Erro', () => {
    test('Deve exibir mensagem de erro ao falhar na autenticação', async ({ loginPage }) => {
      await loginPage.login('invalido@test.com', 'senha123', false);
      await loginPage.expectErrorMessage(/incorret/i);
    });
  });

  test.describe('Proteção de Rotas', () => {
    test('Não deve permitir acesso a rotas privadas sem autenticação', async ({ page }) => {
      // Tentar ir direto para a página de certificados
      await page.goto('/meus-certificados');
      // Deve redirecionar para o login
      await expect(page).toHaveURL(/\/$/);

      // Tentar ir para a home do bolsista
      await page.goto('/bolsista');
      await expect(page).toHaveURL(/\/$/);

      // Tentar ir para avaliação de tutoria
      await page.goto('/avaliacao-tutoria');
      await expect(page).toHaveURL(/\/$/);
    });
  });

});
