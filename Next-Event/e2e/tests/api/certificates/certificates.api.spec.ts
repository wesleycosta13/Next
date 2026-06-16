import { test, expect } from '../../../fixtures/index';
import { buildUserPayload } from '../../../payloads/userPayload';
import { DbHelper } from '../../../support/database/dbHelper';
import * as path from 'path';
import { z } from 'zod';

// Define o contrato do certificado
const CertificateSchema = z.object({
  id: z.string(),
  title: z.string(),
  institution: z.string(),
  workload: z.number(),
  category: z.enum(['EVENTOS', 'MONITORIA', 'ESTUDOS_INDIVIDUAIS']),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(['pending', 'approved', 'rejected']),
});

test.describe('API - Gerenciamento de Certificados', () => {
  let bolsistaUser: any;
  let token: string;
  let userId: string;
  let bolsistaId: string;
  const pdfPath = path.resolve(__dirname, '../../../support/assets/sample.pdf');
  const txtPath = path.resolve(__dirname, '../../../support/assets/sample.txt');

  test.beforeEach(async ({ userClient, cleanupService }) => {
    // 1. Criar bolsista
    bolsistaUser = buildUserPayload();
    cleanupService.addEmail(bolsistaUser.email);
    
    const regRes = await userClient.createUser(bolsistaUser);
    expect(regRes.ok()).toBeTruthy();

    const userBody = await regRes.json();
    userId = userBody.usuario.id;

    const bolsistaRes = await DbHelper.query('SELECT id FROM "bolsista" WHERE "usuarioId" = $1', [userId]);
    bolsistaId = bolsistaRes.rows[0].id;

    // 2. Fazer login via API para obter token
    const loginRes = await userClient.login({
      email: bolsistaUser.email,
      senha: bolsistaUser.senha,
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginBody = await loginRes.json();
    token = loginBody.token;
  });

  test.describe('Fluxo Principal', () => {
    test('Deve realizar o upload físico de certificado com sucesso e validar contrato @smoke', async ({ certificateClient }) => {
      const details = {
        titulo: `API Evento de Teste ${Date.now()}`,
        categoria: 'EVENTOS' as const,
        startDate: '2025-05-01',
        endDate: '2025-05-15',
        horas: '40',
        instituicao: 'UFC',
        descricao: 'Treinamento de Automação de Testes',
      };

      const res = await certificateClient.uploadCertificate(token, pdfPath, details);
      expect(res.status()).toBe(201);

      const body = await res.json();
      
      // Validação de Contrato pelo Schema Zod
      const parsed = CertificateSchema.safeParse(body);
      expect(parsed.success).toBeTruthy();

      expect(body.title).toBe(details.titulo);
      expect(body.category).toBe(details.categoria);
      expect(body.workload).toBe(40);
      expect(body.status).toBe('pending');

      // Limpar certificado
      await certificateClient.deleteCertificate(token, body.id);
    });

    test('Deve listar os certificados do bolsista corretamente', async ({ certificateClient }) => {
      const details = {
        titulo: `API Evento Listagem ${Date.now()}`,
        categoria: 'MONITORIA' as const,
        startDate: '2025-05-01',
        endDate: '2025-05-15',
        horas: '12',
        instituicao: 'UFC',
        descricao: 'Monitoria E2E',
      };

      // Fazer upload
      const uploadRes = await certificateClient.uploadCertificate(token, pdfPath, details);
      expect(uploadRes.status()).toBe(201);
      const uploadedCert = await uploadRes.json();

      // Listar
      const listRes = await certificateClient.listUserCertificates(token, userId);
      expect(listRes.status()).toBe(200);

      const listBody = await listRes.json();
      expect(Array.isArray(listBody.certificates)).toBeTruthy();

      const found = listBody.certificates.find((c: any) => c.id === uploadedCert.id);
      expect(found).toBeDefined();
      expect(found.title).toBe(details.titulo);

      // Limpar
      await certificateClient.deleteCertificate(token, uploadedCert.id);
    });

    test('Deve permitir que um Coordenador aprove ou reprove certificados @smoke', async ({ certificateClient, userClient, cleanupService }) => {
      // 1. Bolsista faz upload de um certificado
      const details = {
        titulo: `API Cert Coord ${Date.now()}`,
        categoria: 'EVENTOS' as const,
        startDate: '2025-05-01',
        endDate: '2025-05-15',
        horas: '40',
        instituicao: 'UFC',
        descricao: 'Validação por Coordenador API',
      };

      const uploadRes = await certificateClient.uploadCertificate(token, pdfPath, details);
      expect(uploadRes.status()).toBe(201);
      const cert = await uploadRes.json();

      // 2. Criar e logar com perfil de Coordenador
      const coordEmail = `coord_api_${Date.now()}@test.com`;
      cleanupService.addEmail(coordEmail);
      const coordPayload = buildUserPayload({
        email: coordEmail,
        bolsista: null,
        tutor: null,
        coordenador: {
          area: 'Tecnologia',
          nivel: 'Senior'
        }
      });
      const regCoord = await userClient.createUser(coordPayload);
      expect(regCoord.ok()).toBeTruthy();

      const loginCoord = await userClient.login({
        email: coordEmail,
        senha: coordPayload.senha
      });
      expect(loginCoord.ok()).toBeTruthy();
      const loginCoordBody = await loginCoord.json();
      const coordToken = loginCoordBody.token;

      // 3. Coordenador aprova o certificado
      const approveRes = await certificateClient.updateStatus(coordToken, cert.id, 'approved');
      expect(approveRes.status()).toBe(200);

      // Validar status no banco
      const checkApprove = await DbHelper.query('SELECT status FROM "certificado" WHERE id = $1', [cert.id]);
      expect(checkApprove.rows[0].status).toBe('APROVADO');

      // 4. Coordenador rejeita o certificado
      const rejectRes = await certificateClient.updateStatus(coordToken, cert.id, 'rejected');
      expect(rejectRes.status()).toBe(200);

      // Validar status no banco
      const checkReject = await DbHelper.query('SELECT status FROM "certificado" WHERE id = $1', [cert.id]);
      expect(checkReject.rows[0].status).toBe('REJEITADO');

      // Limpar certificado
      await certificateClient.deleteCertificate(token, cert.id);
    });

    test('Deve impedir que um Bolsista altere o status de um certificado (403 Forbidden)', async ({ certificateClient }) => {
      // 1. Bolsista faz upload de um certificado
      const details = {
        titulo: `API Cert Bolsista Tenta Aprovar ${Date.now()}`,
        categoria: 'EVENTOS' as const,
      };

      const uploadRes = await certificateClient.uploadCertificate(token, pdfPath, details);
      expect(uploadRes.status()).toBe(201);
      const cert = await uploadRes.json();

      // 2. Bolsista tenta alterar o status do próprio certificado (não autorizado)
      const res = await certificateClient.updateStatus(token, cert.id, 'approved');
      expect(res.status()).toBe(403);

      // Limpar certificado
      await certificateClient.deleteCertificate(token, cert.id);
    });
  });

  test.describe('Feedback de Erro e Segurança', () => {
    test('Não deve permitir upload sem token de autorização', async ({ certificateClient }) => {
      const details = {
        titulo: 'API Não Autorizada',
        categoria: 'ESTUDOS_INDIVIDUAIS' as const,
      };

      const res = await certificateClient.uploadCertificate('', pdfPath, details);
      expect(res.status()).toBe(401);
    });

    test('Deve rejeitar arquivos com mimetypes inválidos (ex: .txt)', async ({ certificateClient }) => {
      const details = {
        titulo: 'Txt Inválido API',
        categoria: 'EVENTOS' as const,
      };

      const res = await certificateClient.uploadCertificate(token, txtPath, details);
      expect(res.status()).toBe(400);
      
      const body = await res.json();
      expect(body.message || body.error).toMatch(/apenas arquivos pdf ou imagens|Invalid PDF structure/i);
    });
  });

});
