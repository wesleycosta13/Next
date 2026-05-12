import { apiTest as test, expect } from '../../../fixtures/apiFixture';
import { buildUserPayload } from '../../../payloads/userPayload';

test.describe('API - Cadastro de Usuário', () => {

  test.describe('Validações de Campos (Bad Requests)', () => {
    test('Deve validar formato de Email inválido', async ({ userClient }) => {
      const payload = buildUserPayload({ email: 'email-invalido' });
      const res = await userClient.createUser(payload);
      
      expect(res.status()).toBe(400);
      const body = await res.json();
      // A API retorna: { "errors": ["E-mail inválido"] }
      expect(JSON.stringify(body)).toMatch(/E-mail|email|inválido/i);
    });

    test('Deve exigir preenchimento do Email', async ({ userClient }) => {
      const payload = buildUserPayload({ email: '' });
      const res = await userClient.createUser(payload);
      
      expect(res.status()).toBe(400);
    });

    test('Deve exigir preenchimento do Ano de ingresso', async ({ userClient }) => {
      // Cria o payload e sobrescreve bolsista tirando anoIngresso ou enviando vazio/nulo
      const payload = buildUserPayload();
      payload.bolsista = { ...payload.bolsista, anoIngresso: null as any };

      const res = await userClient.createUser(payload);
      expect(res.status()).toBe(400);
    });
  });

  test.describe('Regras de Negócio (Erros de Backend)', () => {
    test('Deve bloquear Email duplicado @regression', async ({ userClient, testData }) => {
      const payload = buildUserPayload();
      testData.emailCriado = payload.email; // Salva para teardown

      // Primeiro cadastro
      const res1 = await userClient.createUser(payload);
      expect(res1.status()).toBe(201);

      // Tenta cadastrar novamente com o mesmo email e dados diferentes para o resto (para isolar a falha do email)
      const outroPayload = buildUserPayload({ email: payload.email });
      const res2 = await userClient.createUser(outroPayload);
      
      expect(res2.status()).not.toBe(201); // 400 ou 409
      const body = await res2.json();
      expect(JSON.stringify(body)).toMatch(/usuário já existe|email já está em uso/i);
    });

    test('Deve bloquear Matrícula duplicada', async ({ userClient, testData }) => {
      const payload = buildUserPayload();
      testData.emailCriado = payload.email;

      const res1 = await userClient.createUser(payload);
      expect(res1.status()).toBe(201);

      const outroPayload = buildUserPayload({ matricula: payload.matricula });
      // Salvando também esse para limpeza, caso dê problema (o que seria uma falha do teste)
      testData.emailCriado = outroPayload.email; 

      const res2 = await userClient.createUser(outroPayload);
      expect(res2.status()).not.toBe(201);
      const body = await res2.json();
      expect(JSON.stringify(body)).toMatch(/usuário já existe|matrícula já|já cadastrad/i);
    });

    test('Deve bloquear CPF duplicado', async ({ userClient, testData }) => {
      const payload = buildUserPayload();
      testData.emailCriado = payload.email;

      const res1 = await userClient.createUser(payload);
      expect(res1.status()).toBe(201);

      const outroPayload = buildUserPayload({ cpf: payload.cpf });
      testData.emailCriado = outroPayload.email; // Atualiza pro teardown limpar o último, mas de fato ambos deveriam ser limpos se o 2o passasse erroneamente

      const res2 = await userClient.createUser(outroPayload);
      expect(res2.status()).not.toBe(201);
      const body = await res2.json();
      expect(JSON.stringify(body)).toMatch(/usuário já existe|cpf já|já cadastrad/i);
    });

    test('Deve recusar Senha fraca', async ({ userClient }) => {
      const payload = buildUserPayload({ senha: '123' });
      const res = await userClient.createUser(payload);
      
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(JSON.stringify(body)).toMatch(/6 caractere|senha/i);
    });

    test('Deve exibir erro ao informar Ano com menos de 4 dígitos', async ({ userClient }) => {
      const payload = buildUserPayload();
      payload.bolsista.anoIngresso = 123;
      
      const res = await userClient.createUser(payload);
      expect(res.status()).toBe(400);
    });

    test('Deve exibir erro para Ano inválido', async ({ userClient }) => {
      const payload = buildUserPayload();
      payload.bolsista.anoIngresso = 3000;
      
      const res = await userClient.createUser(payload);
      expect(res.status()).toBe(400);
    });
  });

  test.describe('Fluxo Feliz', () => {
    test('Cadastro com sucesso @smoke', async ({ userClient, testData }) => {
      const payload = buildUserPayload();
      testData.emailCriado = payload.email;

      const res = await userClient.createUser(payload);
      
      expect(res.status()).toBe(201);
      const body = await res.json();
      
      // A API retorna: { "usuario": { "id": ..., "email": ..., "nome": ... } }
      expect(body).toHaveProperty('usuario');
      expect(body.usuario).toHaveProperty('id');
      expect(body.usuario.email).toBe(payload.email);
      expect(body.usuario.nome).toBe(payload.nome);
    });
  });

});
