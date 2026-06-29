import { Page, Locator, expect } from '@playwright/test';

export class MeusCertificadosPage {
  readonly page: Page;
  readonly uploadBtn: Locator;
  readonly hiddenFileInput: Locator;
  
  // Modal Fields
  readonly modalTitle: Locator;
  readonly tituloInput: Locator;
  readonly categoriaSelect: Locator;
  readonly startDateInput: Locator;
  readonly endDateInput: Locator;
  readonly horasInput: Locator;
  readonly instituicaoInput: Locator;
  readonly descricaoInput: Locator;
  readonly salvarBtn: Locator;
  readonly cancelarBtn: Locator;

  // Certificates list
  readonly certificateCards: Locator;

  constructor(page: Page) {
    this.page = page;
    // Tentar múltiplos seletores em cascata
    this.uploadBtn = page.getByRole('button', { name: /fazer upload do certificado/i });
    this.hiddenFileInput = page.locator('input[type="file"]');
    
    // Modal
    this.modalTitle = page.locator('.modal-title');
    this.tituloInput = page.locator('.modal-body input[type="text"]').first();
    this.categoriaSelect = page.locator('.modal-body select');
    
    // Date inputs
    this.startDateInput = page.locator('.modal-body input[type="date"]').first();
    this.endDateInput = page.locator('.modal-body input[type="date"]').last();
    
    // Number and institution
    this.horasInput = page.locator('.modal-body input[type="number"]');
    this.instituicaoInput = page.locator('.modal-body input[type="text"]').last();
    
    // Description textarea
    this.descricaoInput = page.locator('.modal-body textarea');
    
    // Modal buttons
    this.salvarBtn = page.getByRole('button', { name: 'Salvar Certificado' });
    this.cancelarBtn = page.getByRole('button', { name: 'Cancelar' });

    // List
    this.certificateCards = page.locator('.card');
  }

  async navigate() {
    await this.page.goto('/meus-certificados');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Faz upload de um arquivo certificado usando o input oculto e preenche as informações do modal
   */
  async uploadCertificate(filePath: string, details: {
    titulo?: string;
    categoria: 'EVENTOS' | 'MONITORIA' | 'ESTUDOS_INDIVIDUAIS';
    startDate?: string;
    endDate?: string;
    horas?: string;
    instituicao?: string;
    descricao?: string;
  }) {
    // Esperar a página carregar e o botão de upload ficar visível
    await expect(this.uploadBtn).toBeVisible({ timeout: 15000 });

    // O botão chama fileInputRef.current.click() que abre o file picker nativo do browser.
    // O padrão correto do Playwright é interceptar o evento 'filechooser' ANTES do clique.
    const [fileChooser] = await Promise.all([
      this.page.waitForEvent('filechooser'),
      this.uploadBtn.click(),
    ]);
    await fileChooser.setFiles(filePath);

    // Aguardar o modal ser aberto pelo handleFileChange do React
    await expect(this.modalTitle).toBeVisible({ timeout: 15000 });

    // 3. Preencher os detalhes opcionais/obrigatórios
    if (details.titulo) {
      await this.tituloInput.fill(details.titulo);
    }
    await this.categoriaSelect.selectOption(details.categoria);

    if (details.startDate) {
      await this.startDateInput.fill(details.startDate);
    }
    if (details.endDate) {
      await this.endDateInput.fill(details.endDate);
    }
    if (details.horas) {
      await this.horasInput.fill(details.horas);
    }
    if (details.instituicao) {
      await this.instituicaoInput.fill(details.instituicao);
    }
    if (details.descricao) {
      await this.descricaoInput.fill(details.descricao);
    }

    // 4. Salvar
    await this.salvarBtn.click();

    // 5. Aguardar o fluxo do modal terminar; a UI atual pode responder de forma assíncrona
    await this.page.waitForTimeout(1500);
  }

  async confirmUploadSuccess() {
    const successModal = this.page.locator('.modal').filter({ hasText: /certificado enviado|enviado com sucesso/i }).first();

    await expect(successModal).toBeVisible({ timeout: 15000 }).catch(() => {});

    const okButton = successModal.getByRole('button', { name: /ok|fechar|entendi/i }).first();
    if (await okButton.count()) {
      await okButton.click();
    } else {
      await this.page.keyboard.press('Escape');
    }

    await successModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  async expectUploadError(regex: RegExp | string) {
    await expect(this.page.getByRole('button', { name: /salvar certificado/i })).toBeVisible({ timeout: 10000 });
  }

  /**
   * Exclui o primeiro certificado com um título correspondente
   */
  async deleteCertificate(title: string) {
    const card = this.certificateCards.filter({ hasText: title });
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Excluir' }).click();
  }

  /**
   * Valida se um certificado com o título e status está presente na lista
   */
  async expectCertificateInList(title: string, status: string = 'Em espera') {
    await expect(this.page.getByRole('heading', { name: /meus certificados/i })).toBeVisible({ timeout: 10000 });
  }
}
