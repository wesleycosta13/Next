import { test, expect } from '../../../fixtures/index';
import { buildUserPayload } from '../../../payloads/userPayload';
import { DbHelper } from '../../../support/database/dbHelper';

test.describe('UI - Dashboard do Bolsista', () => {
  let bolsistaUser: any;

  test.beforeEach(async ({ userClient, cleanupService }) => {
    // 1. Criar usuário dinâmico
    bolsistaUser = buildUserPayload();
    cleanupService.addEmail(bolsistaUser.email);
    
    const response = await userClient.createUser(bolsistaUser);
    expect(response.ok()).toBeTruthy();
  });

  test('Deve carregar o painel do bolsista corretamente com nome e cards', async ({ loginPage, dashboardPage, page }) => {
    // 1. Realizar Login
    await loginPage.navigate();
    await loginPage.login(bolsistaUser.email, bolsistaUser.senha);

    // 2. Navegar explicitamente para o painel do bolsista
    // (independente do redirecionamento automático do Login.jsx)
    await page.goto('/bolsista');
    await expect(page).toHaveURL(/\/bolsista/);

    // 3. Validar elementos da Dashboard via Page Object
    await dashboardPage.expectDashboardLoaded(bolsistaUser.nome);

    // 4. Validar que o badge de "Aluno" (bolsista) está visível
    await expect(dashboardPage.userBadge).toBeVisible();
    await expect(dashboardPage.userBadge).toContainText('Aluno');
  });

  test('Deve navegar entre as páginas do menu com sucesso', async ({ loginPage, dashboardPage, page }) => {
    // 1. Login e navegação explícita para o painel
    await loginPage.navigate();
    await loginPage.login(bolsistaUser.email, bolsistaUser.senha);
    await page.goto('/bolsista');
    await expect(page).toHaveURL(/\/bolsista/);

    // 2. Navegar para Certificados usando o menu
    await dashboardPage.certificadosLink.click();
    await expect(page).toHaveURL(/\/meus-certificados/);

    // 3. Navegar de volta para a Home
    await dashboardPage.homeLink.click();
    await expect(page).toHaveURL(/\/bolsista/);

    // 4. Navegar para Avaliação Tutoria usando o menu
    await dashboardPage.avaliacaoLink.click();
    await expect(page).toHaveURL(/\/avaliacao-tutoria/);
  });

  test('Deve clicar em editar perfil com sucesso', async ({ loginPage, dashboardPage, page }) => {
    // 1. Login e navegação explícita para o painel
    await loginPage.navigate();
    await loginPage.login(bolsistaUser.email, bolsistaUser.senha);
    await page.goto('/bolsista');
    await expect(page).toHaveURL(/\/bolsista/);

    // 2. Clicar no botão de Editar Perfil
    await dashboardPage.editarPerfilBtn.click();
    // (O botão redireciona para a mesma página no componente atual, mas validamos a capacidade de interagir com ele)
    await expect(dashboardPage.editarPerfilBtn).toBeVisible();
  });

});
