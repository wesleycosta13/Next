import { test, expect } from '../../../fixtures/index';
import { buildUserPayload } from '../../../payloads/userPayload';
import { DbHelper } from '../../../support/database/dbHelper';
import * as path from 'path';

test.describe('UI - Gerenciamento de Certificados', () => {
  let bolsistaUser: any;
  let periodoId: string;
  const pdfPath = path.resolve(__dirname, '../../../support/assets/sample.pdf');
  const txtPath = path.resolve(__dirname, '../../../support/assets/sample.txt');

  test.beforeEach(async ({ userClient, cleanupService }) => {
    // 1. Criar usuário bolsista
    bolsistaUser = buildUserPayload();
    cleanupService.addEmail(bolsistaUser.email);
    
    const response = await userClient.createUser(bolsistaUser);
    expect(response.ok()).toBeTruthy();

    // 2. Garantir que exista um período de tutoria ativo para o envio de certificados
    periodoId = await DbHelper.ensurePeriodoTutoria('E2E Certificados Periodo');
    expect(periodoId).toBeTruthy();
  });

  test('Deve realizar upload de certificado válido (PDF) com sucesso', async ({ loginPage, meusCertificadosPage, page }) => {
    const certTitle = `Certificado de Eventos ${Date.now()}`;
    let certificates: any[] = [];

    await page.route('**/api/certificates/upload', async route => {
      certificates = [{ id: 'cert-success', title: certTitle, status: 'pending', workload: 30, startDate: '2024-01-01', endDate: '2024-01-02' }];
      await route.fulfill({ status: 200, json: { success: true, certificate: certificates[0] } });
    });

    await page.route('**/api/certificates/user/*', async route => {
      await route.fulfill({ json: { certificates } });
    });

    // 1. Login e navegação
    await loginPage.navigate();
    await loginPage.login(bolsistaUser.email, bolsistaUser.senha);
    await page.goto('/bolsista');
    await expect(page).toHaveURL(/\/bolsista/);
    await meusCertificadosPage.navigate();

    // 2. Upload do certificado
    await meusCertificadosPage.uploadCertificate(pdfPath, {
      titulo: certTitle,
      categoria: 'EVENTOS',
      horas: '30',
      instituicao: 'UFC - Universidade Federal do Ceará',
      descricao: 'Participação no Encontro de Iniciação Científica',
    });

    // 3. Fechar modal de sucesso antes de continuar
    await meusCertificadosPage.confirmUploadSuccess();

    // 4. Validar o certificado na listagem com status "Em espera"
    await meusCertificadosPage.expectCertificateInList(certTitle, 'Em espera');
  });

  test('Deve exibir erro ao tentar enviar arquivo com extensão inválida', async ({ loginPage, meusCertificadosPage, page }) => {
    await page.route('**/api/certificates/upload', async route => {
      await route.fulfill({ status: 400, json: { error: 'Apenas arquivos PDF ou imagens são permitidos.' } });
    });

    await page.route('**/api/certificates/user/*', async route => {
      await route.fulfill({ json: { certificates: [] } });
    });

    // 1. Login e navegação
    await loginPage.navigate();
    await loginPage.login(bolsistaUser.email, bolsistaUser.senha);
    await page.goto('/bolsista');
    await expect(page).toHaveURL(/\/bolsista/);
    await meusCertificadosPage.navigate();

    // 2. Upload do arquivo inválido (.txt)
    await meusCertificadosPage.uploadCertificate(txtPath, {
      titulo: 'Certificado Texto Inválido',
      categoria: 'MONITORIA',
      horas: '20',
      instituicao: 'Universidade Invalida',
      descricao: 'Teste de formato inválido',
    });

    // 3. Validar mensagem de erro exibida no componente de alerta
    await meusCertificadosPage.expectUploadError(/apenas arquivos pdf ou imagens|erro ao enviar certificado/i);
  });

  test('Deve poder excluir um certificado com sucesso', async ({ loginPage, meusCertificadosPage, page }) => {
    const certTitle = `Certificado para Excluir ${Date.now()}`;
    let certificates: any[] = [{ id: 'cert-delete', title: certTitle, status: 'pending', workload: 10, startDate: '2024-01-01', endDate: '2024-01-02' }];
    let deleteRequested = false;

    await page.route('**/api/certificates/user/*', async route => {
      await route.fulfill({ json: { certificates } });
    });

    await page.route('**/api/certificates/*', async route => {
      if (route.request().method() === 'DELETE') {
        deleteRequested = true;
        certificates = [];
        await route.fulfill({ status: 200, json: { success: true } });
        return;
      }
      await route.continue();
    });

    // 1. Login e navegação
    await loginPage.navigate();
    await loginPage.login(bolsistaUser.email, bolsistaUser.senha);
    await page.goto('/bolsista');
    await expect(page).toHaveURL(/\/bolsista/);
    await meusCertificadosPage.navigate();

    // 2. Validar o certificado já presente na lista
    await meusCertificadosPage.expectCertificateInList(certTitle, 'Em espera');

    // 3. Configurar dialog de confirmação de exclusão
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Tem certeza que deseja excluir');
      await dialog.accept();
    });

    // 4. Excluir o certificado
    await meusCertificadosPage.deleteCertificate(certTitle);

    // 5. Validar que a exclusão foi solicitada e que a lista foi atualizada
    await expect.poll(async () => deleteRequested, { timeout: 10000 }).toBe(true);
    await expect.poll(async () => await page.locator('.card').filter({ hasText: certTitle }).count(), { timeout: 10000 }).toBe(0);
  });

});
