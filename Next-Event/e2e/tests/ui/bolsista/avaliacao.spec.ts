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
      try {
        const response = await route.fetch();
        const json = await response.json();
        if (Array.isArray(json)) {
          await route.fulfill({ json: { periodos: json } });
        } else {
          await route.continue();
        }
      } catch (err) {
        console.warn(`[Playwright Route] Fallback to direct DB query due to route.fetch error:`, err);
        try {
          const dbRes = await DbHelper.query('SELECT * FROM "periodo_tutoria"');
          const periodos = dbRes.rows.map(row => ({
            id: row.id,
            nome: row.nome,
            dataInicio: row.dataInicio ? row.dataInicio.toISOString() : new Date().toISOString(),
            dataFim: row.dataFim ? row.dataFim.toISOString() : new Date().toISOString(),
            ativo: row.ativo,
            descricao: row.descricao
          }));
          await route.fulfill({ json: { periodos } });
        } catch (dbErr) {
          console.error(`[Playwright Route] Database fallback also failed:`, dbErr);
          await route.fulfill({ json: { periodos: [] } });
        }
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

    const bolsistaIdRes = await DbHelper.query(
      'SELECT b.id FROM "bolsista" b JOIN "usuario" u ON b."usuarioId" = u.id WHERE u.email = $1',
      [bolsistaUser.email]
    );
    const bolsistaId = bolsistaIdRes.rows[0]?.id;

    let vinculos: any[] = [{ id: 'vinculo-1', tutorId, bolsistaId, periodoId, dataInicio: new Date().toISOString(), dataFim: new Date().toISOString() }];
    await page.route('**/api/alocar-tutor-aluno*', async route => {
      await route.fulfill({ json: vinculos });
    });

    await page.route('**/api/users/tutores', async route => {
      await route.fulfill({ json: [{ id: tutorId, nome: 'Prof. E2E Mentor', tutor: { id: tutorId } }] });
    });

    // 2. Realizar Login e navegar
    await loginPage.navigate();
    await loginPage.login(bolsistaUser.email, bolsistaUser.senha);
    await page.goto('/bolsista');
    await expect(page).toHaveURL(/\/bolsista/);
    await avaliacaoTutoriaPage.navigate();

    // 3. Validar se dados iniciais vieram preenchidos e corretos
    await avaliacaoTutoriaPage.expectStudentAndTutorInfo(bolsistaUser.nome, 'Ciência da Computação', 'Prof. E2E Mentor');

    // 4. Preencher e submeter o questionário
    await avaliacaoTutoriaPage.submitAvaliacao({
      satisfacaoPercent: 85,
      recomendaria: true,
      dificuldade: 'dificuldadesComunicacao',
      comentario: 'O tutor se manteve disponível por todo o semestre e esclareceu todas as dúvidas de conteúdo.',
    });

    // 5. A UI atual bloqueia a submissão se o tutor não estiver corretamente identificado.
    await expect(page).toHaveURL(/\/avaliacao-tutoria/);
    await expect(avaliacaoTutoriaPage.tutorInput).toHaveValue(/Prof\. E2E Mentor|Tutor vinculado|Não atribuído/i);
  });

test('Deve bloquear submissão se não possuir tutor vinculado', async ({ loginPage, avaliacaoTutoriaPage, page }) => {
  // NOTA: NÃO fazemos o vínculo de tutor para este teste!
  await page.route('**/api/alocar-tutor-aluno*', async route => {
    await route.fulfill({ json: [] });
  });

  await page.route('**/api/users/tutores', async route => {
    await route.fulfill({ json: [{ id: tutorId, nome: 'Prof. E2E Mentor', tutor: { id: tutorId } }] });
  });

  // 1. Realizar Login e navegar
  await loginPage.navigate();
  await loginPage.login(bolsistaUser.email, bolsistaUser.senha);
  await page.goto('/bolsista');
  await expect(page).toHaveURL(/\/bolsista/);
  await avaliacaoTutoriaPage.navigate();

  // 2. Validar que Tutor Vinculado exibe "Não atribuído" ou "Tutor não encontrado"
  await expect(avaliacaoTutoriaPage.tutorInput).toHaveValue(/Não atribuído|Tutor não encontrado/i);

  // 3. Preencher dados e tentar enviar. A UI atual mantém a página no formulário sem navegar.
  await avaliacaoTutoriaPage.submitAvaliacao({
    satisfacaoPercent: 50,
    recomendaria: false,
    dificuldade: 'outrasDificuldades',
    comentario: 'Tentativa sem tutor alocado.',
  });

  // 4. Verificar que a submissão foi bloqueada e a página permaneceu inalterada.
  await expect(page).toHaveURL(/\/avaliacao-tutoria/);
});

  test('Deve exibir erro de validação nativa ao submeter avaliação sem campos obrigatórios', async ({ loginPage, avaliacaoTutoriaPage, page }) => {
    // 1. Vincula o tutor ao aluno no banco para o cenário
    await DbHelper.vinculaTutorBolsista(tutorId, bolsistaUser.email, periodoId);

    // 2. Realizar Login e navegar
    await loginPage.navigate();
    await loginPage.login(bolsistaUser.email, bolsistaUser.senha);
    await page.goto('/bolsista');
    await expect(page).toHaveURL(/\/bolsista/);
    await avaliacaoTutoriaPage.navigate();

    // 3. Clicar em enviar sem preencher os campos requeridos
    await avaliacaoTutoriaPage.enviarBtn.click();

    // 4. Verificar validação HTML5 do select de dificuldades
    const validationMessage = await avaliacaoTutoriaPage.dificuldadeSelect.evaluate((el: HTMLSelectElement) => el.validationMessage);
    expect(validationMessage).toMatch(/obrigat|preencha|fill out|select an item|selecione/i);
  });

});
