import { test, expect } from '../../../fixtures/index';
import { buildUserPayload } from '../../../payloads/userPayload';
import { DbHelper } from '../../../support/database/dbHelper';
import { z } from 'zod';

const AvaliacaoResponseSchema = z.object({
  id: z.string(),
  usuarioId: z.string(),
  periodoId: z.string(),
  tipoAvaliador: z.string(),
  conteudo: z.object({
    experiencia: z.object({
      comentarioGeral: z.string(),
    }),
    nivelSatisfacaoGeral: z.string(),
    recomendariaPrograma: z.boolean(),
    justificativaRecomendacao: z.string(),
    periodoAvaliado: z.string(),
  }),
  status: z.string(),
  dataEnvio: z.string(),
});

test.describe('API - Avaliações de Tutoria', () => {
  let bolsistaUser: any;
  let token: string;
  let userId: string;
  let tutorId: string;
  let periodoId: string;

  test.beforeEach(async ({ userClient, cleanupService }) => {
    // 1. Criar bolsista
    bolsistaUser = buildUserPayload();
    cleanupService.addEmail(bolsistaUser.email);
    
    const regRes = await userClient.createUser(bolsistaUser);
    expect(regRes.ok()).toBeTruthy();

    const userBody = await regRes.json();
    userId = userBody.usuario.id;

    // 2. Fazer login via API para obter token
    const loginRes = await userClient.login({
      email: bolsistaUser.email,
      senha: bolsistaUser.senha,
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginBody = await loginRes.json();
    token = loginBody.token;

    // 3. Garantir Período de Tutoria e Tutor ativos com e-mail único para evitar colisões
    periodoId = await DbHelper.ensurePeriodoTutoria('API Tutoria Periodo 2026');
    const uniqueTutorEmail = `mentor_api_${Math.floor(Math.random() * 1000000)}@test.com`;
    cleanupService.addEmail(uniqueTutorEmail);
    tutorId = await DbHelper.ensureTutor('Dr. Mentor API', uniqueTutorEmail);
  });

  test.describe('Fluxo Principal', () => {
    test('Deve enviar avaliação de tutoria com sucesso e validar contrato @smoke', async ({ avaliacaoClient }) => {
      // Garantir o vínculo tutor-aluno no banco
      await DbHelper.vinculaTutorBolsista(tutorId, bolsistaUser.email, periodoId);

      const payload = {
        periodoId,
        tipoAvaliador: 'ALUNO' as const,
        aspectosPositivos: [],
        aspectosNegativos: [],
        sugestoesMelhorias: [],
        comentarioGeral: 'Muito bom suporte técnico e acadêmico prestado pelo tutor.',
        dificuldadesComunicacao: 'Não',
        dificuldadesConteudo: 'Não',
        dificuldadesMetodologicas: 'Não',
        dificuldadesRecursos: 'Não',
        outrasDificuldades: '',
        nivelSatisfacaoGeral: 'SATISFEITO' as const,
        recomendariaPrograma: true,
        justificativaRecomendacao: 'Recomendo com certeza!',
        periodoAvaliado: '01/01/2026 até 30/06/2026',
      };

      const res = await avaliacaoClient.createAvaliacao(token, payload);
      if (res.status() !== 201) {
        console.log("DEBUG: createAvaliacao error response:", await res.text());
      }
      expect(res.status()).toBe(201);

      const body = await res.json();
      
      // Validação de Contrato pelo Zod Schema (na propriedade data)
      const parsed = AvaliacaoResponseSchema.safeParse(body.data);
      expect(parsed.success).toBeTruthy();

      expect(body.data.usuarioId).toBe(userId);
      expect(body.data.periodoId).toBe(periodoId);
      expect(body.data.conteudo.experiencia.comentarioGeral).toBe(payload.comentarioGeral);
      expect(body.data.conteudo.nivelSatisfacaoGeral).toBe(payload.nivelSatisfacaoGeral);
      expect(body.data.status).toBe('RASCUNHO');
    });

    test('Deve listar minhas avaliações enviadas com sucesso', async ({ avaliacaoClient }) => {
      // Garantir o vínculo tutor-aluno e enviar
      await DbHelper.vinculaTutorBolsista(tutorId, bolsistaUser.email, periodoId);

      const payload = {
        periodoId,
        tipoAvaliador: 'ALUNO' as const,
        aspectosPositivos: [],
        aspectosNegativos: [],
        sugestoesMelhorias: [],
        comentarioGeral: 'Excelente.',
        dificuldadesComunicacao: 'Não',
        dificuldadesConteudo: 'Não',
        dificuldadesMetodologicas: 'Não',
        dificuldadesRecursos: 'Não',
        outrasDificuldades: '',
        nivelSatisfacaoGeral: 'MUITO_SATISFEITO' as const,
        recomendariaPrograma: true,
        justificativaRecomendacao: 'Sim.',
        periodoAvaliado: '01/01/2026',
      };

      const createRes = await avaliacaoClient.createAvaliacao(token, payload);
      expect(createRes.status()).toBe(201);
      const createdEvalBody = await createRes.json();
      const createdEval = createdEvalBody.data;

      // Listar minhas
      const listRes = await avaliacaoClient.listMyAvaliacoes(token);
      expect(listRes.status()).toBe(200);

      const listBody = await listRes.json();
      expect(Array.isArray(listBody.data)).toBeTruthy();

      const found = listBody.data.find((a: any) => a.id === createdEval.id);
      expect(found).toBeDefined();
      expect(found.conteudo.experiencia.comentarioGeral).toBe(payload.comentarioGeral);
    });
  });

  test.describe('Segurança e Regras', () => {
    test('Não deve permitir envio sem token de autorização', async ({ avaliacaoClient }) => {
      const payload = {
        periodoId,
        tipoAvaliador: 'ALUNO' as const,
        aspectosPositivos: [],
        aspectosNegativos: [],
        sugestoesMelhorias: [],
        comentarioGeral: 'Sem token.',
        dificuldadesComunicacao: 'Não',
        dificuldadesConteudo: 'Não',
        dificuldadesMetodologicas: 'Não',
        dificuldadesRecursos: 'Não',
        outrasDificuldades: '',
        nivelSatisfacaoGeral: 'NEUTRO' as const,
        recomendariaPrograma: true,
        justificativaRecomendacao: 'Sim.',
        periodoAvaliado: '01/01/2026',
      };

      const res = await avaliacaoClient.createAvaliacao('', payload);
      expect(res.status()).toBe(401);
    });

    test('Deve rejeitar envio se dados obrigatórios estiverem ausentes', async ({ avaliacaoClient }) => {
      const payload = {
        periodoId,
        tipoAvaliador: 'ALUNO' as const,
        aspectosPositivos: [],
        aspectosNegativos: [],
        sugestoesMelhorias: [],
        comentarioGeral: '', // Vazio, obrigatório!
        dificuldadesComunicacao: 'Não',
        dificuldadesConteudo: 'Não',
        dificuldadesMetodologicas: 'Não',
        dificuldadesRecursos: 'Não',
        outrasDificuldades: '',
        nivelSatisfacaoGeral: 'NEUTRO' as const,
        recomendariaPrograma: true,
        justificativaRecomendacao: 'Sim.',
        periodoAvaliado: '01/01/2026',
      };

      const res = await avaliacaoClient.createAvaliacao(token, payload);
      expect(res.status()).toBe(400);

      const body = await res.json();
      expect(body.error).toMatch(/comentário geral é obrigatório/i);
    });
  });

  test.describe('Coordenador e Tutor', () => {
    test('Deve permitir que um Tutor envie avaliação de tutoria com sucesso @smoke', async ({ avaliacaoClient, userClient, cleanupService }) => {
      // 1. Criar e logar com Tutor
      const tutorEmail = `tutor_api_eval_${Date.now()}@test.com`;
      cleanupService.addEmail(tutorEmail);
      const tutorPayload = buildUserPayload({
        email: tutorEmail,
        bolsista: null,
        tutor: {
          area: 'Tecnologia',
          nivel: 'Coordenador',
          capacidadeMaxima: 5
        }
      });
      const regTutor = await userClient.createUser(tutorPayload);
      expect(regTutor.ok()).toBeTruthy();

      const loginTutor = await userClient.login({
        email: tutorEmail,
        senha: tutorPayload.senha
      });
      expect(loginTutor.ok()).toBeTruthy();
      const loginTutorBody = await loginTutor.json();
      const tutorToken = loginTutorBody.token;

      // 2. Enviar avaliação como Tutor
      const payload = {
        periodoId,
        tipoAvaliador: 'TUTOR' as const,
        aspectosPositivos: [],
        aspectosNegativos: [],
        sugestoesMelhorias: [],
        comentarioGeral: 'Avaliação de tutoria enviada pelo tutor.',
        dificuldadesComunicacao: 'Não',
        dificuldadesConteudo: 'Não',
        dificuldadesMetodologicas: 'Não',
        dificuldadesRecursos: 'Não',
        outrasDificuldades: '',
        nivelSatisfacaoGeral: 'SATISFEITO' as const,
        recomendariaPrograma: true,
        justificativaRecomendacao: 'Sim.',
        periodoAvaliado: '01/01/2026',
      };

      const res = await avaliacaoClient.createAvaliacao(tutorToken, payload);
      expect(res.status()).toBe(201);
    });

    test('Deve permitir que um Coordenador liste todas as avaliações do período', async ({ avaliacaoClient, userClient, cleanupService }) => {
      // 1. Criar e logar com Coordenador
      const coordEmail = `coord_api_eval_${Date.now()}@test.com`;
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

      // 2. Listar todas
      const res = await avaliacaoClient.listAllAvaliacoes(coordToken);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBeTruthy();
    });

    test('Deve negar acesso a listar todas as avaliações para perfis não coordenadores (403 Forbidden)', async ({ avaliacaoClient }) => {
      // Usar o token do Bolsista configurado no beforeEach
      const res = await avaliacaoClient.listAllAvaliacoes(token);
      expect(res.status()).toBe(403);
    });
  });

});
