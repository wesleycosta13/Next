import { test, expect } from '../../fixtures/testBase';
import { gerarDadosUsuario } from '../../utils/dataFactory';

test.describe('Cadastro de Usuário', () => {

  test.beforeEach(async ({ registerPage }) => {
    await registerPage.navigate();
  });

  test.describe('Validações de HTML', () => {
    test('Deve validar formato de Email inválido', async ({ registerPage }) => {
      const user = gerarDadosUsuario();
      user.email = 'email-invalido';

      await registerPage.fillForm(user);
      await registerPage.submit();

      const validationMessage = await registerPage.getHtmlValidationMessage(registerPage.emailInput);
      expect(validationMessage).toMatch(/@|email/i);
    });

    test('Deve exigir preenchimento do Email', async ({ registerPage }) => {
      const user = gerarDadosUsuario();
      user.email = '';

      await registerPage.fillForm(user);
      await registerPage.submit();

      const validationMessage = await registerPage.getHtmlValidationMessage(registerPage.emailInput);
      expect(validationMessage).toMatch(/obrigat|preencha|fill out/i);
    });

    test('Deve exigir preenchimento do Ano de ingresso', async ({ registerPage }) => {
      const user = gerarDadosUsuario();

      await registerPage.fillForm(user, { ano: '' });
      await registerPage.submit();

      const validationMessage = await registerPage.getHtmlValidationMessage(registerPage.anoInput);
      expect(validationMessage).toMatch(/obrigat|preencha|fill out/i);
    });
  });

  test.describe('Regras de Negócio (Erros de Backend)', () => {
    test('Deve bloquear Email duplicado @regression', async ({ registerPage, testData }) => {
      const user = gerarDadosUsuario();
      testData.emailCriado = user.email; // Grava para exclusão no teardown

      // Primeiro cadastro (Preparação de estado)
      await registerPage.fillForm(user);
      const setupRes = await registerPage.submitAndWaitForResponse();
      expect(setupRes.status()).toBe(201);
      await registerPage.waitForSuccess(); // Garante sucesso do setup para seguir o teste

      // Tenta cadastrar novamente com o mesmo email
      const outroUser = gerarDadosUsuario();
      outroUser.email = user.email;

      await registerPage.navigate();
      await registerPage.fillForm(outroUser);
      const errRes = await registerPage.submitAndWaitForResponse();
      expect(errRes.ok()).toBeFalsy(); // Deve falhar na API

      await registerPage.expectErrorToContainText(/usuário já existe|email já está em uso/i);
    });

    test('Deve bloquear Matrícula duplicada', async ({ registerPage, testData }) => {
      const user = gerarDadosUsuario();
      testData.emailCriado = user.email;

      await registerPage.fillForm(user);
      const setupRes = await registerPage.submitAndWaitForResponse();
      expect(setupRes.status()).toBe(201);
      await registerPage.waitForSuccess();

      const outroUser = gerarDadosUsuario();
      outroUser.matricula = user.matricula;

      await registerPage.navigate();
      await registerPage.fillForm(outroUser);
      const errRes = await registerPage.submitAndWaitForResponse();
      expect(errRes.ok()).toBeFalsy();

      await registerPage.expectErrorToContainText(/usuário já existe|matrícula já|já cadastrad/i);
    });

    test('Deve bloquear CPF duplicado', async ({ registerPage, testData }) => {
      const user = gerarDadosUsuario();
      testData.emailCriado = user.email;

      await registerPage.fillForm(user);
      const setupRes = await registerPage.submitAndWaitForResponse();
      expect(setupRes.status()).toBe(201);
      await registerPage.waitForSuccess();

      const outroUser = gerarDadosUsuario();
      outroUser.cpf = user.cpf;

      await registerPage.navigate();
      await registerPage.fillForm(outroUser);
      const errRes = await registerPage.submitAndWaitForResponse();
      expect(errRes.ok()).toBeFalsy();

      await registerPage.expectErrorToContainText(/usuário já existe|cpf já|já cadastrad/i);
    });

    test('Deve recusar Senha fraca', async ({ registerPage }) => {
      const user = gerarDadosUsuario();

      await registerPage.fillForm(user, { senha: '123' });
      const errRes = await registerPage.submitAndWaitForResponse();
      expect(errRes.ok()).toBeFalsy();

      await registerPage.expectErrorToContainText(/A senha deve conter pelo menos 6 caractere/i);
    });

    test('Deve exibir erro ao informar Ano com menos de 4 dígitos', async ({ registerPage }) => {
      const user = gerarDadosUsuario();

      await registerPage.fillForm(user, { ano: '123' });
      const errRes = await registerPage.submitAndWaitForResponse();
      expect(errRes.ok()).toBeFalsy();

      await registerPage.expectErrorToContainText(/4 dígitos/i);
    });

    test('Deve exibir erro para Ano inválido', async ({ registerPage }) => {
      const user = gerarDadosUsuario();

      await registerPage.fillForm(user, { ano: '3000' });
      const errRes = await registerPage.submitAndWaitForResponse();
      expect(errRes.ok()).toBeFalsy();

      await registerPage.expectErrorToContainText(/inválido/i);
    });
  });

  test.describe('Fluxo Feliz', () => {
    test('Cadastro com sucesso @smoke', async ({ registerPage, testData, page }) => {
      const user = gerarDadosUsuario();
      testData.emailCriado = user.email;

      await registerPage.fillForm(user);
      
      const res = await registerPage.submitAndWaitForResponse();
      expect(res.status()).toBe(201);
      
      // Espera explícita pelo estado de sucesso, garantindo estabilidade
      await registerPage.waitForSuccess();
      await registerPage.goToLogin();

      await expect(page).toHaveURL('http://localhost:4000/');
    });
  });

});