import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly senhaInput: Locator;
  readonly loginButton: Locator;
  readonly alertBox: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('#usuario-email');
    this.senhaInput = page.locator('#usuario-senha');
    this.loginButton = page.getByRole('button', { name: 'Fazer Login' });
    this.alertBox = page.locator('.alert, [role="alert"]'); 
  }

  async navigate() {
    await this.page.goto('/');
    await expect(this.emailInput).toBeVisible({ timeout: 15000 });
  }

  async login(email: string, senha: string, expectSuccess = true) {
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.emailInput.fill(email);
    await this.senhaInput.fill(senha);
    await this.loginButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.loginButton.click();
    if (expectSuccess) {
      // Esperar a redireção após login bem-sucedido
      await this.page.waitForURL(/\/(aluno|coordenador|bolsista|home-tutor)\/?$/, { timeout: 15000 });
    }
  }

  /**
   * Aguarda e valida se uma mensagem de erro apareceu na tela.
   */
  async expectErrorMessage(text: string | RegExp) {
    const alert = this.page.locator('.alert, [role="alert"]').filter({ hasText: text });
    await expect(alert).toBeVisible({ timeout: 10000 });
  }
}
