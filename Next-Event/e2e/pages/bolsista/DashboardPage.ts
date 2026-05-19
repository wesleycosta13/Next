import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly welcomeHeader: Locator;
  readonly userBadge: Locator;
  readonly userNameSpan: Locator;
  readonly logoutButton: Locator;
  
  // Cards
  readonly certificadosCard: Locator;
  readonly avaliacaoCard: Locator;
  
  // Botões dos Cards
  readonly verCertificadosBtn: Locator;
  readonly verAvaliacaoBtn: Locator;
  readonly editarPerfilBtn: Locator;

  // Links do Menu
  readonly homeLink: Locator;
  readonly certificadosLink: Locator;
  readonly avaliacaoLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.welcomeHeader = page.locator('h1.text-primary.fw-bold');
    this.userBadge = page.locator('.badge.bg-light');
    this.userNameSpan = page.locator('.d-flex.align-items-center.gap-2 span');
    this.logoutButton = page.getByRole('button', { name: /sair/i });

    // Encontra os cards pelas estruturas de h3
    this.certificadosCard = page.locator('.card', { hasText: 'Upload de certificados' });
    this.avaliacaoCard = page.locator('.card', { hasText: 'Avaliação de tutoria' });

    this.verCertificadosBtn = this.certificadosCard.getByRole('button', { name: 'Veja mais' });
    this.verAvaliacaoBtn = this.avaliacaoCard.getByRole('button', { name: 'Veja mais' });
    this.editarPerfilBtn = page.getByRole('button', { name: /editar perfil/i });

    // Links de Navegação
    this.homeLink = page.locator('.nav-link', { hasText: 'Home' });
    this.certificadosLink = page.locator('.nav-link', { hasText: 'Certificados' });
    this.avaliacaoLink = page.locator('.nav-link', { hasText: 'Avaliação Tutoria' });
  }

  async navigate() {
    await this.page.goto('/bolsista');
  }

  async logout() {
    await this.logoutButton.click();
  }

  async expectDashboardLoaded(name: string) {
    const firstName = name.split(' ')[0];
    await expect(this.welcomeHeader).toContainText(`Seja bem-vindo ${firstName}`);
    await expect(this.certificadosCard).toBeVisible();
    await expect(this.avaliacaoCard).toBeVisible();
  }
}
