import { test, expect } from '../../../fixtures/index';
import { buildUserPayload } from '../../../payloads/userPayload';
import { DbHelper } from '../../../support/database/dbHelper';
import * as path from 'path';

test.describe('UI - Gerenciamento de Certificados', () => {
  let bolsistaUser: any;
  const pdfPath = path.resolve(__dirname, '../../../support/assets/sample.pdf');
  const txtPath = path.resolve(__dirname, '../../../support/assets/sample.txt');

  test.beforeEach(async ({ userClient, cleanupService }) => {
    // 1. Criar usuário bolsista
    bolsistaUser = buildUserPayload();
    cleanupService.addEmail(bolsistaUser.email);
    
    const response = await userClient.createUser(bolsistaUser);
    expect(response.ok()).toBeTruthy();
  });

  test('Deve realizar upload de certificado válido (PDF) com sucesso', async ({ loginPage, meusCertificadosPage, page }) => {
    // 1. Login e navegação
    await loginPage.navigate();
    await loginPage.login(bolsistaUser.email, bolsistaUser.senha);
    await expect(page).toHaveURL(/\/bolsista/);
    await meusCertificadosPage.navigate();

    // 2. Configurar listener para o alert do navegador
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Certificado enviado com sucesso');
      await dialog.accept();
    });

    // 3. Upload do certificado
    const certTitle = `Certificado de Eventos ${Date.now()}`;
    await meusCertificadosPage.uploadCertificate(pdfPath, {
      titulo: certTitle,
      categoria: 'EVENTOS',
      startDate: '2025-05-01',
      endDate: '2025-05-15',
      horas: '30',
      instituicao: 'UFC - Universidade Federal do Ceará',
      descricao: 'Participação no Encontro de Iniciação Científica',
    });

    // 4. Validar o certificado na listagem com status "Em espera"
    await meusCertificadosPage.expectCertificateInList(certTitle, 'Em espera');
  });

  test('Deve exibir erro ao tentar enviar arquivo com extensão inválida', async ({ loginPage, meusCertificadosPage, page }) => {
    // 1. Login e navegação
    await loginPage.navigate();
    await loginPage.login(bolsistaUser.email, bolsistaUser.senha);
    await expect(page).toHaveURL(/\/bolsista/);
    await meusCertificadosPage.navigate();

    // 2. Configurar listener para o alert de erro do backend/mimetype
    page.once('dialog', async dialog => {
      expect(dialog.message()).toMatch(/apenas arquivos pdf ou imagens|erro ao enviar certificado/i);
      await dialog.accept();
    });

    // 3. Upload do arquivo inválido (.txt)
    await meusCertificadosPage.uploadCertificate(txtPath, {
      titulo: 'Certificado Texto Inválido',
      categoria: 'MONITORIA',
      startDate: '2025-05-01',
      endDate: '2025-05-15',
      horas: '20',
      instituicao: 'Universidade Invalida',
      descricao: 'Teste de formato inválido',
    });
  });

  test('Deve poder excluir um certificado com sucesso', async ({ loginPage, meusCertificadosPage, page }) => {
    // 1. Login e navegação
    await loginPage.navigate();
    await loginPage.login(bolsistaUser.email, bolsistaUser.senha);
    await expect(page).toHaveURL(/\/bolsista/);
    await meusCertificadosPage.navigate();

    // 2. Fazer upload de um certificado primeiro
    const certTitle = `Certificado para Excluir ${Date.now()}`;
    
    // Alert de sucesso do upload
    page.once('dialog', async dialog => {
      await dialog.accept();
    });

    await meusCertificadosPage.uploadCertificate(pdfPath, {
      titulo: certTitle,
      categoria: 'ESTUDOS_INDIVIDUAIS',
      startDate: '2025-05-01',
      endDate: '2025-05-15',
      horas: '10',
      instituicao: 'UFC',
      descricao: 'Curso livre de informática',
    });

    // Garantir que está na lista
    await meusCertificadosPage.expectCertificateInList(certTitle);

    // 3. Configurar dialog de confirmação de exclusão
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Tem certeza que deseja excluir');
      await dialog.accept(); // Clica em OK
    });

    // Excluir
    await meusCertificadosPage.deleteCertificate(certTitle);

    // 4. Validar sumiço da lista
    const card = meusCertificadosPage.certificateCards.filter({ hasText: certTitle });
    await expect(card).not.toBeVisible();
  });

});
