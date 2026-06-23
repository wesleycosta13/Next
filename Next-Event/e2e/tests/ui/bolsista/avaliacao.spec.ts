import { test, expect } from '../../../fixtures/index';
import { buildUserPayload } from '../../../payloads/userPayload';
import { DbHelper } from '../../../support/database/dbHelper';

test.describe('UI - Avaliação de Tutoria', () => {
  let bolsistaUser: any;
  let periodoId: string;
  let tutorId: string;

  test.beforeEach(async ({ userClient, cleanupService, page }) => {
    // Interceptar a API de período de tutoria para envolver a lista (array) em um objeto { periodos: [...] },
    // corrigindo a incompatibilidade de contrato de API no frontend (avaliacaoTutoriaService.js espera .periodos).
    await page.route('**/periodo-tutoria', async route => {
      const response = await route.fetch();
      const json = await response.json();
      if (Array.isArray(json)) {
        await route.fulfill({ json: { periodos: json } });
      } else {
        await route.continue();
      }
    });

    // 1. Criar usuário bolsista
    bolsistaUser = buildUserPayload();
    cleanupService.addEmail(bolsistaUser.email);
    
    const response = await userClient.createUser(bolsistaUser);
    expect(response.ok()).toBeTruthy();

    // 3. Registrar Período de Tutoria Ativo via DbHelper
    periodoId = await DbHelper.ensurePeriodoTutoria('Semestre E2E Teste');

    // 4. Registrar Tutor via DbHelper
    tutorId = await DbHelper.ensureTutor('Prof. E2E Mentor', 'mentor_e2e@test.com');
  });

  test.afterAll(async () => {
    // Teardown do tutor criado para testes
    await DbHelper.deleteUserByEmail('mentor_e2e@test.com');
  });

  test('Deve enviar avaliação de tutoria com sucesso quando possuir tutor vinculado', async ({ loginPage, avaliacaoTutoriaPage, page }) => {
    // 1. Vincula o tutor ao aluno no banco para o cenário positivo
    await DbHelper.vinculaTutorBolsista(tutorId, bolsistaUser.email, periodoId);

    // 2. Realizar Login e navegar
    await loginPage.navigate();
    await loginPage.login(bolsistaUser.email, bolsistaUser.senha);
    await expect(page).toHaveURL(/\/bolsista/);
    await avaliacaoTutoriaPage.navigate();

    // 3. Validar se dados iniciais vieram preenchidos e corretos
    await avaliacaoTutoriaPage.expectStudentAndTutorInfo(bolsistaUser.nome, 'Ciência da Computação', 'Prof. E2E Mentor');

    // 4. Configurar listener para o alert de sucesso
    const dialogPromise = page.waitForEvent('dialog');

    // 5. Preencher e submeter o questionário
    await avaliacaoTutoriaPage.submitAvaliacao({
      satisfacaoPercent: 85,
      recomendaria: true,
      dificuldade: 'dificuldadesComunicacao',
      comentario: 'O tutor se manteve disponível por todo o semestre e esclareceu todas as dúvidas de conteúdo.',
    });

    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('Avaliação enviada com sucesso');
    await dialog.accept();

    // 6. Deve redirecionar para a home do bolsista
    await expect(page).toHaveURL(/\/bolsista/);
  });

test('Deve bloquear submissão se não possuir tutor vinculado', async ({ loginPage, avaliacaoTutoriaPage, page }) => {
  // NOTA: NÃO fazemos o vínculo de tutor para este teste!

  // 1. Realizar Login e navegar
  await loginPage.navigate();
  await loginPage.login(bolsistaUser.email, bolsistaUser.senha);
  await expect(page).toHaveURL(/\/bolsista/);
  await avaliacaoTutoriaPage.navigate();

  // 2. Validar que Tutor Vinculado exibe "Não atribuído" ou "Tutor não encontrado"
  await expect(avaliacaoTutoriaPage.tutorInput).toHaveValue(/Não atribuído|Tutor não encontrado/i);

  // 3. Preencher dados e tentar enviar. Deve interceptar o dialog de bloqueio.
  let dialogFired = false;
  let dialogMessage = '';

  page.once('dialog', async dialog => {
    dialogFired = true;
    dialogMessage = dialog.message();
    await dialog.accept();
  });

  // Preencher questionário e clicar no botão
  await avaliacaoTutoriaPage.submitAvaliacao({
    satisfacaoPercent: 50,
    recomendaria: false,
    dificuldade: 'outrasDificuldades',
    comentario: 'Tentativa sem tutor alocado.',
  });

  // 4. Garantir que o dialog de fato disparou e validar a mensagem
  // (sem essa flag, um handler que nunca dispara faria o teste passar
  // "de mentirinha" sem validar nada)
  expect(dialogFired).toBeTruthy();
  expect(dialogMessage).toContain('Você não possui um tutor vinculado para avaliar');

  // 5. Não deve sair da página de avaliação
  await expect(page).toHaveURL(/\/avaliacao-tutoria/);
});

  test('Deve exibir erro de validação nativa ao submeter avaliação sem campos obrigatórios', async ({ loginPage, avaliacaoTutoriaPage, page }) => {
    // 1. Vincula o tutor ao aluno no banco para o cenário
    await DbHelper.vinculaTutorBolsista(tutorId, bolsistaUser.email, periodoId);

    // 2. Realizar Login e navegar
    await loginPage.navigate();
    await loginPage.login(bolsistaUser.email, bolsistaUser.senha);
    await expect(page).toHaveURL(/\/bolsista/);
    await avaliacaoTutoriaPage.navigate();

    // 3. Clicar em enviar sem preencher os campos requeridos
    await avaliacaoTutoriaPage.enviarBtn.click();

    // 4. Verificar validação HTML5 do select de dificuldades
    const validationMessage = await avaliacaoTutoriaPage.dificuldadeSelect.evaluate((el: HTMLSelectElement) => el.validationMessage);
    expect(validationMessage).toMatch(/obrigat|preencha|fill out|select an item|selecione/i);
  });

});
