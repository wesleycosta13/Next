import { test, expect } from '../../../fixtures/index';
import { buildUserPayload } from '../../../payloads/userPayload';
import { DbHelper } from '../../../support/database/dbHelper';

test.describe('UI - Tutor Acadêmico', () => {
  let tutorEmail: string;
  let tutorNome: string;
  let tutorId: string;
  let periodoId: string;
  let bolsistaUser: any;

  test.beforeEach(async ({ userClient, cleanupService }) => {
    // 1. Criar e registrar Tutor no banco via API do sistema
    const timestamp = Date.now().toString();
    tutorNome = `Prof E2E Tutor ${timestamp.slice(-4)}`;
    tutorEmail = `tutor_e2e_${timestamp.slice(-4)}@test.com`;
    
    const tutorPayload = buildUserPayload({
      nome: tutorNome,
      email: tutorEmail,
      senha: 'SenhaForte123',
      bolsista: null,
      tutor: {
        area: 'Tecnologia',
        nivel: 'Coordenador',
        capacidadeMaxima: 5
      }
    });

    cleanupService.addEmail(tutorEmail);
    const tutorRes = await userClient.createUser(tutorPayload);
    expect(tutorRes.ok()).toBeTruthy();
    const tutorData = await tutorRes.json();
    tutorId = tutorData.usuario.tutor.id;

    // 2. Criar usuário bolsista para vincular a este tutor
    bolsistaUser = buildUserPayload();
    cleanupService.addEmail(bolsistaUser.email);
    const response = await userClient.createUser(bolsistaUser);
    expect(response.ok()).toBeTruthy();

    // 3. Garantir período ativo e vincular o bolsista ao tutor
    periodoId = await DbHelper.ensurePeriodoTutoria(`Semestre Tutor ${timestamp.slice(-4)}`);
    await DbHelper.vinculaTutorBolsista(tutorId, bolsistaUser.email, periodoId);
  });

  test('Deve logar com sucesso e renderizar a home do tutor com os cards @smoke', async ({ loginPage, tutorPage, page }) => {
    // 1. Login comum
    await loginPage.navigate();
    await loginPage.login(tutorEmail, 'SenhaForte123');

    // 2. Redirecionamento dinâmico
    await expect(page).toHaveURL(/\/home-tutor/);

    // 3. Validação da Home
    await expect(tutorPage.tutorNameBadge).toContainText(tutorNome);
    await expect(tutorPage.registroAlunosCardBtn).toBeVisible();
    await expect(tutorPage.registroFormulariosCardBtn).toBeVisible();
  });

  test('Deve visualizar lista de alunos vinculados e enviar formulário de acompanhamento com sucesso', async ({ loginPage, tutorPage, page }) => {
    // 1. Login do Tutor
    await loginPage.navigate();
    await loginPage.login(tutorEmail, 'SenhaForte123');
    await expect(page).toHaveURL(/\/home-tutor/);

    // 2. Navegar para a lista de alunos
    await tutorPage.navigateToAlunos();
    
    // 3. Validar presença do bolsista vinculado na tabela
    const row = page.locator('tr', { hasText: bolsistaUser.nome });
    await expect(row).toBeVisible();

    // 4. Iniciar novo formulário
    await row.getByRole('button', { name: /novo form/i }).click();
    await expect(page).toHaveURL(/\/forms-tutor/);

    // 5. Preencher e submeter o formulário de acompanhamento
    // Escutando alerta de sucesso nativo
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('enviado com sucesso');
      await dialog.accept();
    });

    await tutorPage.fillAndSubmitForm({
      virtuais: 3,
      presenciais: 2,
      dificuldade: 'conteudo',
      descricao: 'O aluno apresentou dificuldades moderadas com a parte prática de algoritmos e estruturas de dados.'
    });

    // 6. Validar que foi redirecionado para a página de relatórios/histórico
    await expect(page).toHaveURL(/\/relatorios-tutor/);
  });
});
