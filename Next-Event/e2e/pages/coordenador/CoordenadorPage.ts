import { Page, Locator, expect } from '@playwright/test';

export class CoordenadorPage {
  readonly page: Page;

  // Header / Navbar links
  readonly homeLink: Locator;
  readonly logoutBtn: Locator;

  // Home Page Cards
  readonly registroAlunosCardBtn: Locator;
  readonly registroTutoresCardBtn: Locator;
  readonly predefinicoesCardBtn: Locator;
  readonly relatorioTutoresCardBtn: Locator;
  readonly relatorioAlunosCardBtn: Locator;
  readonly validarCertificadosCardBtn: Locator;
  readonly gerenciarPapeisCardBtn: Locator;

  // Validar Certificados Page
  readonly pendentesTab: Locator;
  readonly aprovadosTab: Locator;
  readonly negadosTab: Locator;
  readonly certCards: Locator;
  
  // Rejection Modal
  readonly modalTitle: Locator;
  readonly motivoInput: Locator;
  readonly confirmarReprovacaoBtn: Locator;

  // Atribuir Papel Page
  readonly usersTable: Locator;
  readonly roleSelect: Locator;
  readonly confirmarAlteracoesBtn: Locator;
  readonly removerPapelBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    // Navbar
    this.homeLink = page.getByRole('link', { name: 'Home' });
    this.logoutBtn = page.getByRole('button', { name: /sair/i });

    // Home Page Buttons
    this.registroAlunosCardBtn = page.locator('div.card', { hasText: 'Registro de alunos' }).getByRole('button', { name: 'Veja mais' });
    this.registroTutoresCardBtn = page.locator('div.card', { hasText: 'Registro de tutores' }).getByRole('button', { name: 'Veja mais' });
    this.predefinicoesCardBtn = page.locator('div.card', { hasText: 'Predefinições' }).getByRole('button', { name: 'Veja mais' });
    this.relatorioTutoresCardBtn = page.locator('div.card', { hasText: 'Relatório Individual de Tutores' }).getByRole('button', { name: 'Veja mais' });
    this.relatorioAlunosCardBtn = page.locator('div.card', { hasText: 'Relatório Individual de Alunos' }).getByRole('button', { name: 'Veja mais' });
    this.validarCertificadosCardBtn = page.locator('div.card', { hasText: 'Validação dos Certificados' }).getByRole('button', { name: 'Veja mais' });
    this.gerenciarPapeisCardBtn = page.locator('div.card', { hasText: 'Gerenciar Papéis' }).getByRole('button', { name: 'Veja mais' });

    // Validar Certificados Tabs
    this.pendentesTab = page.getByRole('button', { name: /pendentes/i });
    this.aprovadosTab = page.getByRole('button', { name: /aprovados/i });
    this.negadosTab = page.getByRole('button', { name: /negados/i });
    this.certCards = page.locator('.card'); // Certificados são renderizados em cards

    // Rejection Modal
    this.modalTitle = page.locator('.modal-title');
    this.motivoInput = page.locator('textarea');
    this.confirmarReprovacaoBtn = page.getByRole('button', { name: 'Confirmar Reprovação' });

    // Atribuir Papel Page
    this.usersTable = page.locator('table');
    this.roleSelect = page.locator('select');
    this.confirmarAlteracoesBtn = page.getByRole('button', { name: 'Confirmar Alterações' });
    this.removerPapelBtn = page.getByRole('button', { name: 'Remover Papel' });
  }

  async navigateToHome() {
    await this.page.goto('/coordenador');
    await expect(this.page.locator('h1')).toContainText(/seja bem-vindo/i, { timeout: 15000 });
  }

  async navigateToValidarCertificados() {
    await this.page.goto('/validar-certificados');
    await expect(this.page.getByRole('heading', { name: /certificados para validação|certificados aprovados|certificados negados/i })).toBeVisible({ timeout: 15000 });
  }

  async navigateToAtribuirPapel() {
    await this.page.goto('/atribuir-papel');
    await expect(this.page.getByRole('heading', { name: /gerenciamento de papéis/i })).toBeVisible({ timeout: 15000 });
  }

  async selectTab(tab: 'pendente' | 'aprovado' | 'negado') {
    if (tab === 'pendente') {
      await this.pendentesTab.click();
    } else if (tab === 'aprovado') {
      await this.aprovadosTab.click();
    } else if (tab === 'negado') {
      await this.negadosTab.click();
    }
  }

  async aprovarCertificado(title: string) {
    const card = this.certCards.filter({ hasText: title });
    await expect(card).toBeVisible({ timeout: 15000 });
    
    // Escutando alerta de aprovação
    this.page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('aprovado com sucesso');
      await dialog.accept();
    });

    await card.getByRole('button', { name: /aprovar/i }).click();
  }

  async negarCertificado(title: string, motivo: string) {
    const card = this.certCards.filter({ hasText: title });
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.getByRole('button', { name: /negar/i }).click();

    await expect(this.modalTitle).toBeVisible();
    await this.motivoInput.fill(motivo);

    // Escutando alerta de rejeição
    this.page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('rejeitado');
      await dialog.accept();
    });

    await this.confirmarReprovacaoBtn.click();
  }

  async reverterCertificado(title: string) {
    const card = this.certCards.filter({ hasText: title });
    await expect(card).toBeVisible({ timeout: 15000 });
    
    // Escutando alerta de reversão
    this.page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('revertido para pendente');
      await dialog.accept();
    });

    await card.getByRole('button', { name: /reverter para pendente/i }).click();
  }

  async atribuirPapel(email: string, papel: 'tutor' | 'bolsista' | 'coordenador') {
    const row = this.page.locator('tr', { hasText: email });
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.getByRole('button', { name: /alterar papel/i }).click();

    await this.roleSelect.selectOption(papel);

    // Escutando alerta de sucesso da atribuição
    this.page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('executado com sucesso');
      await dialog.accept();
    });

    await this.confirmarAlteracoesBtn.click();
  }
}
