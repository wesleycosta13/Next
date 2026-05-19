import { Page, Locator, expect } from '@playwright/test';
import type { UserData } from '../../support/factories/UserFactory';

export class RegisterPage {
  readonly page: Page;
  readonly nomeInput: Locator;
  readonly matriculaInput: Locator;
  readonly emailInput: Locator;
  readonly cpfInput: Locator;
  readonly anoInput: Locator;
  readonly semestreSelect: Locator;
  readonly cursoSelect: Locator;
  readonly senhaInput: Locator;
  readonly confirmarSenhaInput: Locator;
  readonly cadastrarButton: Locator;
  readonly irParaLoginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Uso de IDs para maior estabilidade, mitigando problemas com getByRole em campos de senha
    this.nomeInput = page.locator('#nome');
    this.matriculaInput = page.locator('#matricula');
    this.emailInput = page.locator('#email');
    this.cpfInput = page.locator('#cpf');
    this.anoInput = page.locator('#anoIngresso');
    this.semestreSelect = page.locator('#semestre');
    this.cursoSelect = page.locator('#curso');
    this.senhaInput = page.locator('#senha');
    this.confirmarSenhaInput = page.locator('#confirmarSenha');

    this.cadastrarButton = page.getByRole('button', { name: 'Cadastrar' });
    this.irParaLoginButton = page.getByRole('button', { name: 'Ir para o Login' });
  }

  async navigate() {
    await this.page.goto('/cadastro');
  }

  async fillForm(user: UserData, options?: { senha?: string, ano?: string }) {
    await this.nomeInput.fill(user.nome);

    await this.matriculaInput.fill(user.matricula);
    await this.emailInput.fill(user.email);
    await this.cpfInput.fill(user.cpf);

    await this.anoInput.fill(options?.ano ?? '2023');
    await this.semestreSelect.selectOption('1');
    await this.cursoSelect.selectOption('Ciência da Computação');

    const senha = options?.senha ?? 'SenhaForte123';
    await this.senhaInput.fill(senha);
    await this.confirmarSenhaInput.fill(senha);
  }

  async submit() {
    await this.cadastrarButton.click();
  }

  /**
   * Submete o formulário aguardando a resposta da API, garantindo menos flakiness.
   */
  async submitAndWaitForResponse() {
    const responsePromise = this.page.waitForResponse(response =>
      response.url().includes('/api/users') && response.request().method() === 'POST'
    );
    await this.cadastrarButton.scrollIntoViewIfNeeded();
    await this.cadastrarButton.click({ force: true, delay: 100 });
    return await responsePromise;
  }

  /**
   * Aguarda o estado de sucesso da operação (aparecimento do botão de Ir para Login).
   * Separado do fluxo de erro para evitar falsos positivos ou timeouts confusos.
   */
  async waitForSuccess() {
     await expect(this.irParaLoginButton).toBeVisible();
   }
   
  async goToLogin() {
    await this.irParaLoginButton.click();
  }

  /**
   * Verifica se uma mensagem de erro de regra de negócio (backend) apareceu na tela.
   */
  async expectErrorToContainText(regexOrText: RegExp | string) {
    const alert = this.page.locator('.alert, [role="alert"], .alert-danger').filter({ hasText: regexOrText });
    await expect(alert).toBeVisible({ timeout: 10000 });
  }

  /**
   * Retorna a mensagem de validação nativa do HTML5 (required, type, etc) de um input específico.
   */
  async getHtmlValidationMessage(locator: Locator): Promise<string> {
    return await locator.evaluate((el: HTMLInputElement) => el.validationMessage);
  }
}
