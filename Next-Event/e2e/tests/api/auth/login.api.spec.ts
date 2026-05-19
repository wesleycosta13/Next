import { test, expect } from '../../../fixtures/index';
import { buildUserPayload } from '../../../payloads/userPayload';
import { LoginResponseSchema, LoginErrorSchema } from '../../../schemas/authSchema';

test.describe('API - Login de Usuário', () => {

  test.describe('Sucesso e Contrato', () => {
    test('Deve realizar login com sucesso e validar contrato @smoke', async ({ userClient, cleanupService }) => {
      // 1. Prepara um usuário (Cadastro)
      const user = buildUserPayload();
      cleanupService.addEmail(user.email);
      await userClient.createUser(user);

      // 2. Realiza o login
      const loginPayload = { email: user.email, senha: user.senha };
      const res = await userClient.login(loginPayload, LoginResponseSchema);
      
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.token).toBeDefined();
      expect(body.usuario.email).toBe(user.email);
    });
  });

  test.describe('Erros de Autenticação', () => {
    test('Deve retornar erro para senha incorreta', async ({ userClient, cleanupService }) => {
      const user = buildUserPayload();
      cleanupService.addEmail(user.email);
      await userClient.createUser(user);

      const loginPayload = { email: user.email, senha: 'SenhaErrada123' };
      const res = await userClient.login(loginPayload);
      
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/incorret/i);
    });

    test('Deve retornar erro para usuário inexistente', async ({ userClient }) => {
      const loginPayload = { email: 'naoexiste@test.com', senha: 'QualquerSenha123' };
      const res = await userClient.login(loginPayload);
      
      expect(res.status()).toBe(400);
    });
  });

});
