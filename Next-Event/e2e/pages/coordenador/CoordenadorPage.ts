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
    this.roleSelect = page.locator('div.modal.show select');
    this.confirmarAlteracoesBtn = page.locator('div.modal.show').getByRole('button', { name: /Confirmar Alterações/i });
    this.removerPapelBtn = page.locator('div.modal.show').getByRole('button', { name: /Remover Papel/i });
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
    // Aguardar o spinner de carregamento sumir (dados carregados da API)
    await this.page.locator('.spinner-border').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  async aprovarCertificado(studentName: string) {
    const card = this.certCards.filter({ hasText: studentName });
    await expect(card).toBeVisible({ timeout: 15000 });

    // Registrar o listener ANTES do clique e aguardar a resolução do dialog
    // para evitar que o handler seja consumido por um dialog subsequente.
    const dialogHandled = new Promise<void>(resolve => {
      this.page.once('dialog', async dialog => {
        expect(dialog.message()).toContain('aprovado com sucesso');
        await dialog.accept();
        resolve();
      });
    });

    await card.getByRole('button', { name: /aprovar/i }).click();
    await dialogHandled;
  }

  async negarCertificado(studentName: string, motivo: string) {
    const card = this.certCards.filter({ hasText: studentName });
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.getByRole('button', { name: /negar/i }).click();

    // Aguardar o modal estar completamente visível e interativo
    await expect(this.modalTitle).toBeVisible({ timeout: 10000 });
    await this.motivoInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.motivoInput.fill(motivo);

    // Aguardar o botão estar visível e habilitado antes de clicar
    await this.confirmarReprovacaoBtn.waitFor({ state: 'visible', timeout: 10000 });

    // Escutando alerta de rejeição
    this.page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('rejeitado');
      await dialog.accept();
    });

    await this.confirmarReprovacaoBtn.click();
    // Aguardar o modal fechar completamente antes de prosseguir
    await this.page.locator('.modal.show').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await this.page.waitForTimeout(500);
  }

  async reverterCertificado(studentName: string) {
    const approvedCard = this.page.locator('.card.border-success', { hasText: studentName });
    await expect(approvedCard).toBeVisible({ timeout: 15000 });

    // Registrar o listener ANTES do clique e aguardar resolução explícita,
    // garantindo que este handler não seja consumido por dialogs anteriores.
    const dialogHandled = new Promise<void>(resolve => {
      this.page.once('dialog', async dialog => {
        expect(dialog.message()).toContain('revertido para pendente');
        await dialog.accept();
        resolve();
      });
    });

    await approvedCard.getByRole('button', { name: /reverter para pendente/i }).click();
    await dialogHandled;
    // Aguardar o card sumir da aba atual (indica que o servidor processou a reversão)
    await expect(approvedCard).not.toBeVisible({ timeout: 15000 });
  }

  async atribuirPapel(email: string, papel: 'tutor' | 'bolsista' | 'coordenador') {
    const row = this.page.locator('table tbody tr', { hasText: email });
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.getByRole('button', { name: /alterar papel/i }).click();

    const modal = this.page.locator('div.modal.show');
    await expect(modal).toBeVisible({ timeout: 15000 });
    await expect(this.roleSelect).toBeVisible({ timeout: 15000 });
    await this.roleSelect.selectOption(papel);

    this.page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('executado com sucesso');
      await dialog.accept();
    });

    const [response] = await Promise.all([
      this.page.waitForResponse(resp =>
        resp.url().includes('/api/users/') && resp.request().method() === 'PATCH'
      ),
      this.confirmarAlteracoesBtn.click()
    ]);

    expect(response.status()).toBe(204);
    await expect(modal).toBeHidden({ timeout: 15000 }).catch(() => {});
  }
}
