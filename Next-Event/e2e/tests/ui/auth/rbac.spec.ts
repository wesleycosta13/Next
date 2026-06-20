import { test, expect } from '../../../fixtures/index';
import { buildUserPayload } from '../../../payloads/userPayload';

test.describe('UI - Controle de Acesso Baseado em Papel (RBAC)', () => {
  let studentUser: any;
  let bolsistaUser: any;
  let tutorUser: any;
  let coordinatorUser: any;

  test.beforeAll(async ({ userClient, cleanupService }) => {
    // 1. Criar Usuário Aluno Comum (student)
    const studentPayload = buildUserPayload({
      bolsista: null,
      tutor: null,
      coordenador: null,
    });
    cleanupService.addEmail(studentPayload.email);
    const studentRes = await userClient.createUser(studentPayload);
    expect(studentRes.ok()).toBeTruthy();
    studentUser = studentPayload;

    // 2. Criar Usuário Bolsista (scholarship_holder)
    const bolsistaPayload = buildUserPayload();
    cleanupService.addEmail(bolsistaPayload.email);
    const bolsistaRes = await userClient.createUser(bolsistaPayload);
    expect(bolsistaRes.ok()).toBeTruthy();
    bolsistaUser = bolsistaPayload;

    // 3. Criar Usuário Tutor (tutor)
    const tutorPayload = buildUserPayload({
      bolsista: null,
      tutor: {
        area: 'Computação',
        nivel: 'Pleno',
        capacidadeMaxima: 5
      },
      coordenador: null,
    });
    cleanupService.addEmail(tutorPayload.email);
    const tutorRes = await userClient.createUser(tutorPayload);
    expect(tutorRes.ok()).toBeTruthy();
    tutorUser = tutorPayload;

    // 4. Criar Usuário Coordenador (coordinator)
    const coordinatorPayload = buildUserPayload({
      bolsista: null,
      tutor: null,
      coordenador: {
        area: 'Tecnologia',
        nivel: 'Senior'
      },
    });
    cleanupService.addEmail(coordinatorPayload.email);
    const coordinatorRes = await userClient.createUser(coordinatorPayload);
    expect(coordinatorRes.ok()).toBeTruthy();
    coordinatorUser = coordinatorPayload;
  });

  test('Aluno Comum não deve conseguir acessar as áreas de Coordenador, Tutor ou Bolsista', async ({ loginPage, page }) => {
    await loginPage.navigate();
    await loginPage.login(studentUser.email, studentUser.senha);

    // Tenta acessar coordenador
    await page.goto('/coordenador');
    await expect(page.locator('text=Verificando permissões...')).toBeVisible({ timeout: 10000 });

    // Tenta acessar tutor
    await page.goto('/home-tutor');
    await expect(page.locator('text=Verificando permissões...')).toBeVisible({ timeout: 10000 });

    // Tenta acessar bolsista
    await page.goto('/bolsista');
    await expect(page.locator('text=Verificando permissões...')).toBeVisible({ timeout: 10000 });
  });

  test('Bolsista não deve conseguir acessar as áreas de Coordenador ou Tutor', async ({ loginPage, page }) => {
    await loginPage.navigate();
    await loginPage.login(bolsistaUser.email, bolsistaUser.senha);

    // Tenta acessar coordenador
    await page.goto('/coordenador');
    await expect(page.locator('text=Verificando permissões...')).toBeVisible({ timeout: 10000 });

    // Tenta acessar tutor
    await page.goto('/home-tutor');
    await expect(page.locator('text=Verificando permissões...')).toBeVisible({ timeout: 10000 });
  });

  test('Tutor não deve conseguir acessar as áreas de Coordenador ou Bolsista', async ({ loginPage, page }) => {
    await loginPage.navigate();
    await loginPage.login(tutorUser.email, tutorUser.senha);

    // Tenta acessar coordenador
    await page.goto('/coordenador');
    await expect(page.locator('text=Verificando permissões...')).toBeVisible({ timeout: 10000 });

    // Tenta acessar bolsista
    await page.goto('/bolsista');
    await expect(page.locator('text=Verificando permissões...')).toBeVisible({ timeout: 10000 });
  });

  test('Coordenador não deve conseguir acessar as áreas de Tutor ou Bolsista', async ({ loginPage, page }) => {
    await loginPage.navigate();
    await loginPage.login(coordinatorUser.email, coordinatorUser.senha);

    // Tenta acessar tutor
    await page.goto('/home-tutor');
    await expect(page.locator('text=Verificando permissões...')).toBeVisible({ timeout: 10000 });

    // Tenta acessar bolsista
    await page.goto('/bolsista');
    await expect(page.locator('text=Verificando permissões...')).toBeVisible({ timeout: 10000 });
  });
});
