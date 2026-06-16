import { test, expect } from '../../../fixtures/index';
import { buildUserPayload } from '../../../payloads/userPayload';
import { DbHelper } from '../../../support/database/dbHelper';
import * as path from 'path';

test.describe('UI - Coordenador', () => {
  let coordNome: string;
  let coordEmail: string;
  const pdfPath = path.resolve(__dirname, '../../../support/assets/sample.pdf');

  test.beforeEach(async ({ userClient, cleanupService }) => {
    // 1. Criar e registrar Coordenador no banco via API do sistema
    const timestamp = Date.now().toString();
    coordNome = `Coord E2E ${timestamp.slice(-4)}`;
    coordEmail = `coord_e2e_${timestamp.slice(-4)}@test.com`;

    const coordPayload = buildUserPayload({
      nome: coordNome,
      email: coordEmail,
      senha: 'SenhaForte123',
      bolsista: null,
      tutor: null,
      coordenador: {
        area: 'Tecnologia',
        nivel: 'Senior'
      }
    });

    cleanupService.addEmail(coordEmail);
    const coordRes = await userClient.createUser(coordPayload);
    expect(coordRes.ok()).toBeTruthy();
  });

  test('Deve logar com sucesso e renderizar a home do coordenador com os cards @smoke', async ({ loginPage, coordenadorPage, page }) => {
    // 1. Login comum
    await loginPage.navigate();
    await loginPage.login(coordEmail, 'SenhaForte123');

    // 2. Redirecionamento dinâmico
    await expect(page).toHaveURL(/\/coordenador/);

    // 3. Validação da Home
    await expect(page.locator('h1')).toContainText(`Seja bem-vindo ${coordNome.split(' ')[0]}`);
    await expect(coordenadorPage.registroAlunosCardBtn).toBeVisible();
    await expect(coordenadorPage.registroTutoresCardBtn).toBeVisible();
    await expect(coordenadorPage.predefinicoesCardBtn).toBeVisible();
    await expect(coordenadorPage.validarCertificadosCardBtn).toBeVisible();
    await expect(coordenadorPage.gerenciarPapeisCardBtn).toBeVisible();
  });

  test('Deve gerenciar o fluxo de validação de certificados (aprovar, reverter e reprovar)', async ({ loginPage, coordenadorPage, userClient, cleanupService, meusCertificadosPage, page }) => {
    // 1. Criar um bolsista e enviar um certificado para testar
    const bolsistaUser = buildUserPayload();
    cleanupService.addEmail(bolsistaUser.email);
    const regRes = await userClient.createUser(bolsistaUser);
    expect(regRes.ok()).toBeTruthy();

    const loginRes = await userClient.login({
      email: bolsistaUser.email,
      senha: bolsistaUser.senha,
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginBody = await loginRes.json();
    const tokenBolsista = loginBody.token;

    const certTitle = `E2E Cert ${Date.now()}`;
    const details = {
      titulo: certTitle,
      categoria: 'EVENTOS' as const,
      startDate: '2025-05-01',
      endDate: '2025-05-15',
      horas: '40',
      instituicao: 'UFC',
      descricao: 'Certificado de teste para coordenador',
    };

    // Fazer upload do certificado pelo bolsista
    await loginPage.navigate();
    await loginPage.login(bolsistaUser.email, bolsistaUser.senha);
    await meusCertificadosPage.navigate();
    await meusCertificadosPage.uploadCertificate(pdfPath, details);
           
    // Reload para garantir que os dados foram salvos
    await page.reload();
    await meusCertificadosPage.expectCertificateInList(certTitle, 'Em espera');

    // Deslogar
    await page.goto('/');

    // 2. Fazer login como Coordenador
    await loginPage.login(coordEmail, 'SenhaForte123');
    await expect(page).toHaveURL(/\/coordenador/);

    // 3. Ir para Validação de Certificados
    await coordenadorPage.navigateToValidarCertificados();

    // 4. Aprovar o certificado
    await coordenadorPage.aprovarCertificado(certTitle);

    // 5. Verificar que está na aba Aprovados
    await coordenadorPage.selectTab('aprovado');
    const approvedCard = page.locator('.card', { hasText: certTitle });
    await expect(approvedCard).toBeVisible({ timeout: 15000 });

    // 6. Reverter o certificado para pendente
    await coordenadorPage.reverterCertificado(certTitle);

    // 7. Negar o certificado com motivo
    await coordenadorPage.selectTab('pendente');
    await coordenadorPage.negarCertificado(certTitle, 'Arquivo PDF ilegível ou corrompido');

    // 8. Verificar que está na aba Negados
    await coordenadorPage.selectTab('negado');
    const rejectedCard = page.locator('.card', { hasText: certTitle });
    await expect(rejectedCard).toBeVisible({ timeout: 15000 });
    await expect(rejectedCard).toContainText('Arquivo PDF ilegível ou corrompido');
  });

  test('Deve atribuir papel de tutor a um usuário comum com sucesso', async ({ loginPage, coordenadorPage, userClient, cleanupService, page }) => {
    // 1. Criar um usuário comum (sem papel de tutor/bolsista/coordenador)
    const baseEmail = `basic_e2e_${Date.now()}@test.com`;
    cleanupService.addEmail(baseEmail);
    const basePayload = buildUserPayload({
      email: baseEmail,
      bolsista: null,
      tutor: null,
      coordenador: null
    });
    const regRes = await userClient.createUser(basePayload);
    expect(regRes.ok()).toBeTruthy();

    // 2. Login como Coordenador
    await loginPage.navigate();
    await loginPage.login(coordEmail, 'SenhaForte123');
    await expect(page).toHaveURL(/\/coordenador/);

    // 3. Ir para a página de gerenciar papéis
    await coordenadorPage.navigateToAtribuirPapel();

    // 4. Atribuir o papel de Tutor
    await coordenadorPage.atribuirPapel(baseEmail, 'tutor');

    // Aguardar um pouco para garantir que o BD foi atualizado
    await page.waitForTimeout(2000);

    // 5. Validar via Banco de Dados que o perfil de tutor foi inserido com sucesso
    const tutorProfile = await DbHelper.query(
      'SELECT t.id FROM "tutor" t JOIN "usuario" u ON t."usuarioId" = u.id WHERE u.email = $1',
      [baseEmail]
    );
    expect(tutorProfile.rows.length).toBeGreaterThan(0);
  });
});
