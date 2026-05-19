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
  });

  test.describe('Feedback de Erro', () => {
    test('Deve exibir mensagem de erro ao falhar na autenticação', async ({ loginPage }) => {
      await loginPage.login('invalido@test.com', 'senha123');
      await loginPage.expectErrorMessage(/incorret/i);
    });
  });

});
