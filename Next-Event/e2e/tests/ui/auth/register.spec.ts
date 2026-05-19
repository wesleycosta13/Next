import { test, expect } from '../../../fixtures/index';
import { UserFactory } from '../../../support/factories/UserFactory';
import { buildUserPayload } from '../../../payloads/userPayload';

test.describe('UI - Cadastro de Usuário', () => {

  test.beforeEach(async ({ registerPage }) => {
    await registerPage.navigate();
  });

  test.describe('Fluxo Principal (Happy Path)', () => {
    test('Deve realizar cadastro com sucesso e redirecionar para login @smoke', async ({ registerPage, cleanupService, page }) => {
      const user = UserFactory.generateUser();
      cleanupService.addEmail(user.email);

      await registerPage.fillForm(user);
      await registerPage.submitAndWaitForResponse();
      
      await registerPage.waitForSuccess();
      await registerPage.goToLogin();

      await expect(page).toHaveURL('/');
    });
  });

  test.describe('Validações Visuais e Feedback', () => {
    test('Deve validar campos obrigatórios via HTML5', async ({ registerPage }) => {
      // Tenta submeter vazio
      await registerPage.submit();

      const validationMessage = await registerPage.getHtmlValidationMessage(registerPage.emailInput);
      expect(validationMessage).toMatch(/obrigat|preencha|fill out/i);
    });

    test('Deve exibir erro do servidor na interface (Feedback Visual)', async ({ registerPage, userClient, cleanupService }) => {
      const payload = buildUserPayload();
      cleanupService.addEmail(payload.email);

      // Pré-cadastra via API com payload completo para forçar erro de duplicidade na UI
      await userClient.createUser(payload);

      await registerPage.navigate(); 
      await registerPage.fillForm(payload);
      await registerPage.submit();

      await registerPage.expectErrorToContainText(/usuário já existe|email já está em uso|matrícula já está cadastrada|cpf já está cadastrado/i);
    });
  });

});