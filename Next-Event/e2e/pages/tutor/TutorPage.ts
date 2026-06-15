import { Page, Locator, expect } from '@playwright/test';

export class TutorPage {
  readonly page: Page;

  // Header / Navbar links
  readonly homeLink: Locator;
  readonly alunosLink: Locator;
  readonly relatoriosLink: Locator;
  readonly logoutBtn: Locator;

  // Home Page locators
  readonly tutorNameBadge: Locator;
  readonly registroAlunosCardBtn: Locator;
  readonly registroFormulariosCardBtn: Locator;
  readonly editarPerfilBtn: Locator;

  // Alunos Page locators
  readonly alunosTable: Locator;
  readonly novoFormBtn: Locator;
  readonly verHistoricoBtn: Locator;

  // Forms Page locators
  readonly virtuaisInput: Locator;
  readonly presenciaisInput: Locator;
  readonly dificuldadeSelect: Locator;
  readonly descricaoTextarea: Locator;
  readonly salvarPreenchimentoBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header / Navbar
    this.homeLink = page.getByRole('link', { name: 'Home' });
    this.alunosLink = page.getByRole('link', { name: 'Alunos' });
    this.relatoriosLink = page.getByRole('link', { name: 'Relatórios' });
    this.logoutBtn = page.getByRole('button', { name: /sair/i });

    // Home Page
    this.tutorNameBadge = page.locator('h2'); // O h2 contém o nome do tutor
    this.registroAlunosCardBtn = page.locator('div.card', { hasText: 'Registro de alunos' }).getByRole('button', { name: 'Veja mais' });
    this.registroFormulariosCardBtn = page.locator('div.card', { hasText: 'Registro de formulários' }).getByRole('button', { name: 'Veja mais' });
    this.editarPerfilBtn = page.getByRole('button', { name: /editar perfil/i });

    // Alunos Page
    this.alunosTable = page.locator('table');
    this.novoFormBtn = page.getByRole('button', { name: /novo form/i });
    this.verHistoricoBtn = page.getByRole('button', { name: /ver histórico/i });

    // Forms Page
    this.virtuaisInput = page.locator('#formEncontrosVirtuais');
    this.presenciaisInput = page.locator('#formEncontrosPresenciais');
    this.dificuldadeSelect = page.locator('#formDificuldades');
    this.descricaoTextarea = page.locator('#formDescricao');
    this.salvarPreenchimentoBtn = page.getByRole('button', { name: /salvar preenchimento/i });
  }

  async navigateToHome() {
    await this.page.goto('/home-tutor');
    await expect(this.page.locator('h1')).toContainText(/seja bem-vindo/i, { timeout: 15000 });
  }

  async navigateToAlunos() {
    try {
      if (await this.alunosLink.isVisible()) {
        await this.alunosLink.click();
      } else {
        await this.page.goto('/alunos-tutor');
      }
    } catch {
      await this.page.goto('/alunos-tutor');
    }
    await expect(this.page.getByRole('heading', { name: 'Meus Alunos Tutorados' })).toBeVisible({ timeout: 15000 });
    await expect(this.alunosTable).toBeVisible({ timeout: 15000 });
  }

  async fillAndSubmitForm(details: {
    virtuais: number;
    presenciais: number;
    dificuldade: string;
    descricao: string;
  }) {
    await expect(this.virtuaisInput).toBeVisible({ timeout: 15000 });
    await this.virtuaisInput.fill(details.virtuais.toString());
    await this.presenciaisInput.fill(details.presenciais.toString());
    await this.dificuldadeSelect.selectOption(details.dificuldade);
    await this.descricaoTextarea.fill(details.descricao);
    await this.salvarPreenchimentoBtn.click();
  }
}
