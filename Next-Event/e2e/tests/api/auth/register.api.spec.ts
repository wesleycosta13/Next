import { test, expect } from '../../../fixtures/index';
import { buildUserPayload } from '../../../payloads/userPayload';
import { RegisterResponseSchema } from '../../../schemas/userSchema';

test.describe('API - Cadastro de Usuário', () => {

  test.describe('Validações de Contrato e Sucesso', () => {
    test('Deve cadastrar usuário com sucesso e validar contrato @smoke', async ({ userClient, cleanupService }) => {
      const payload = buildUserPayload();
      cleanupService.addEmail(payload.email);

      const res = await userClient.createUser(payload, RegisterResponseSchema);
      expect(res.status()).toBe(201);
      
      const body = await res.json();
      expect(body.usuario.email).toBe(payload.email);
    });
  });

  test.describe('Regras de Negócio (Erros de Backend)', () => {
    test('Deve bloquear Email duplicado @regression', async ({ userClient, cleanupService }) => {
      const payload = buildUserPayload();
      cleanupService.addEmail(payload.email);

      // Primeiro cadastro
      await userClient.createUser(payload);

      // Segundo cadastro com mesmo email
      const outroPayload = buildUserPayload({ email: payload.email });
      const res = await userClient.createUser(outroPayload);
      
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(JSON.stringify(body)).toMatch(/usuário já existe|email já está em uso/i);
    });

    test('Deve bloquear Matrícula duplicada', async ({ userClient, cleanupService }) => {
      const payload = buildUserPayload();
      cleanupService.addEmail(payload.email);
      await userClient.createUser(payload);

      const outroPayload = buildUserPayload({ matricula: payload.matricula });
      cleanupService.addEmail(outroPayload.email);
      
      const res = await userClient.createUser(outroPayload);
      expect(res.status()).toBe(400);
    });

    test('Deve bloquear CPF duplicado', async ({ userClient, cleanupService }) => {
      const payload = buildUserPayload();
      cleanupService.addEmail(payload.email);
      await userClient.createUser(payload);

      const outroPayload = buildUserPayload({ cpf: payload.cpf });
      cleanupService.addEmail(outroPayload.email);

      const res = await userClient.createUser(outroPayload);
      expect(res.status()).toBe(400);
    });

    test('Deve recusar Senha fraca', async ({ userClient }) => {
      const payload = buildUserPayload({ senha: '123' });
      const res = await userClient.createUser(payload);
      expect(res.status()).toBe(400);
    });
  });

  test.describe('Validações de Campo', () => {
    test('Deve validar formato de Email inválido', async ({ userClient }) => {
      const payload = buildUserPayload({ email: 'invalido' });
      const res = await userClient.createUser(payload);
      expect(res.status()).toBe(400);
    });
  });
});
