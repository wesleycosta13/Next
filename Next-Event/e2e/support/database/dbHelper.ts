import { Pool } from 'pg';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Garante que o .env seja carregado da raiz do projeto e2e
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Helper para operações diretas no banco de dados.
 * Utilizado principalmente para limpeza de massa de teste (Teardown) e seeding dinâmico.
 */
export class DbHelper {
  
  /**
   * Executa uma query genérica
   */
  static async query(text: string, params?: any[]) {
    return await pool.query(text, params);
  }

  /**
   * Remove um usuário e todas as suas dependências do banco de dados de forma segura.
   */
  static async deleteUserByEmail(email: string) {
    try {
      // 1. Buscar ID do usuário e seus perfis de bolsista/tutor
      const userRes = await pool.query('SELECT id FROM "usuario" WHERE email = $1', [email]);
      if (userRes.rows.length === 0) return;

      const userId = userRes.rows[0].id;

      const bolsistaRes = await pool.query('SELECT id FROM "bolsista" WHERE "usuarioId" = $1', [userId]);
      const tutorRes = await pool.query('SELECT id FROM "tutor" WHERE "usuarioId" = $1', [userId]);

      const bolsistaId = bolsistaRes.rows[0]?.id;
      const tutorId = tutorRes.rows[0]?.id;

      // 2. Deletar vínculos de alocação de tutor e formulários de acompanhamento
      if (bolsistaId) {
        await pool.query('DELETE FROM "alocar_tutor_aluno" WHERE "bolsistaId" = $1', [bolsistaId]);
        await pool.query('DELETE FROM "certificado" WHERE "bolsistaId" = $1', [bolsistaId]);
        await pool.query('DELETE FROM "form_acompanhamento" WHERE "bolsistaId" = $1', [bolsistaId]);
      }
      if (tutorId) {
        await pool.query('DELETE FROM "alocar_tutor_aluno" WHERE "tutorId" = $1', [tutorId]);
        await pool.query('DELETE FROM "form_acompanhamento" WHERE "tutorId" = $1', [tutorId]);
      }

      // 3. Deletar avaliações de tutoria e notificações associadas
      await pool.query('DELETE FROM "avaliacao_tutoria" WHERE "usuarioId" = $1', [userId]);
      await pool.query('DELETE FROM "notification" WHERE "userId" = $1', [userId]);

      // 4. Deletar o próprio usuário (Cascades no bolsista/tutor/coordenador se configurado na FK, mas fazemos explícito por segurança)
      await pool.query('DELETE FROM "usuario" WHERE id = $1', [userId]);
      console.log(`[Database] Usuário e dados vinculados removidos com sucesso: ${email}`);
    } catch (err) {
      console.error(`[Database Error] Erro ao deletar usuário ${email}:`, err);
    }
  }

  /**
   * Garante a existência de um período de tutoria ativo.
   */
  static async ensurePeriodoTutoria(nome: string): Promise<string> {
    const res = await pool.query('SELECT id FROM "periodo_tutoria" WHERE nome = $1', [nome]);
    if (res.rows.length > 0) {
      // Garantir que está ativo
      await pool.query('UPDATE "periodo_tutoria" SET ativo = true WHERE nome = $1', [nome]);
      return res.rows[0].id;
    }

    const insertRes = await pool.query(
      `INSERT INTO "periodo_tutoria" (id, nome, "dataInicio", "dataFim", ativo, descricao) 
       VALUES (gen_random_uuid(), $1, NOW(), NOW() + interval '6 months', true, 'Período gerado para testes automáticos') 
       RETURNING id`,
      [nome]
    );
    console.log(`[Database] Período de tutoria criado: ${nome}`);
    return insertRes.rows[0].id;
  }

  /**
   * Garante a existência de um Tutor com usuário e perfil criados.
   */
  static async ensureTutor(nome: string, email: string): Promise<string> {
    const userRes = await pool.query('SELECT id FROM "usuario" WHERE email = $1', [email]);
    let userId = userRes.rows[0]?.id;

    if (!userId) {
      const insertUser = await pool.query(
        `INSERT INTO "usuario" (id, nome, email, senha, status, "criadoEm", "atualizadoEm") 
         VALUES (gen_random_uuid(), $1, $2, '$2b$10$UnFkQe5QOskFf2T4yO9RvepX2TfFz8Qd4pZz9Gk5qP8u9RvepX2Tf', 'ATIVO', NOW(), NOW())
         RETURNING id`,
        [nome, email]
      );
      userId = insertUser.rows[0].id;
    }

    const tutorRes = await pool.query('SELECT id FROM "tutor" WHERE "usuarioId" = $1', [userId]);
    let tutorId = tutorRes.rows[0]?.id;

    if (!tutorId) {
      const insertTutor = await pool.query(
        `INSERT INTO "tutor" (id, "usuarioId", "capacidadeMaxima") 
         VALUES (gen_random_uuid(), $1, 5) 
         RETURNING id`,
        [userId]
      );
      tutorId = insertTutor.rows[0].id;
      console.log(`[Database] Tutor criado e associado: ${email}`);
    }

    return tutorId;
  }

  /**
   * Vincula um Aluno (Bolsista) a um Tutor sob um Período de tutoria específico.
   */
  static async vinculaTutorBolsista(tutorId: string, emailBolsista: string, periodoId: string) {
    // 1. Obter ID do bolsista
    const userRes = await pool.query('SELECT id FROM "usuario" WHERE email = $1', [emailBolsista]);
    if (userRes.rows.length === 0) {
      throw new Error(`Bolsista com email ${emailBolsista} não encontrado no banco.`);
    }
    const userId = userRes.rows[0].id;

    const bolsistaRes = await pool.query('SELECT id FROM "bolsista" WHERE "usuarioId" = $1', [userId]);
    let bolsistaId = bolsistaRes.rows[0]?.id;

    if (!bolsistaId) {
      // Criar perfil de bolsista caso não exista
      const insertBolsista = await pool.query(
        `INSERT INTO "bolsista" (id, "usuarioId", "anoIngresso", curso) 
         VALUES (gen_random_uuid(), $1, 2024, 'Ciência da Computação') 
         RETURNING id`,
        [userId]
      );
      bolsistaId = insertBolsista.rows[0].id;
    }

    // 2. Verificar se já existe alocação
    const alocRes = await pool.query(
      'SELECT id FROM "alocar_tutor_aluno" WHERE "bolsistaId" = $1 AND "periodoId" = $2',
      [bolsistaId, periodoId]
    );

    if (alocRes.rows.length > 0) {
      // Atualizar alocação existente
      await pool.query(
        'UPDATE "alocar_tutor_aluno" SET "tutorId" = $1, ativo = true WHERE id = $2',
        [tutorId, alocRes.rows[0].id]
      );
    } else {
      // Inserir nova alocação
      await pool.query(
        `INSERT INTO "alocar_tutor_aluno" (id, "tutorId", "bolsistaId", "periodoId", "dataInicio", ativo) 
         VALUES (gen_random_uuid(), $1, $2, $3, NOW(), true)`,
        [tutorId, bolsistaId, periodoId]
      );
    }
    console.log(`[Database] Aluno ${emailBolsista} alocado ao Tutor ID ${tutorId}`);
  }

  /**
   * Fecha o pool de conexões
   */
  static async close() {
    await pool.end();
  }
}
