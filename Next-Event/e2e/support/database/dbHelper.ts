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
    const client = await pool.connect();

    try {
      const userRes = await client.query('SELECT id FROM "usuario" WHERE email = $1', [email]);
      if (userRes.rows.length === 0) return;

      const userId = userRes.rows[0].id;

      const bolsistaRes = await client.query('SELECT id FROM "bolsista" WHERE "usuarioId" = $1', [userId]);
      const tutorRes = await client.query('SELECT id FROM "tutor" WHERE "usuarioId" = $1', [userId]);
      const coordenadorRes = await client.query('SELECT id FROM "coordenador" WHERE "usuarioId" = $1', [userId]);
      const alunoRes = await client.query('SELECT id FROM "aluno" WHERE "usuarioId" = $1', [userId]);

      const bolsistaId = bolsistaRes.rows[0]?.id;
      const tutorId = tutorRes.rows[0]?.id;
      const coordenadorId = coordenadorRes.rows[0]?.id;
      const alunoId = alunoRes.rows[0]?.id;

      await client.query('BEGIN');

      const relatorioIdsToDelete = new Set<string>();

      if (bolsistaId) {
        const relatorioAlunoRes = await client.query('SELECT "relatorioId" FROM "relatorio_aluno" WHERE "bolsistaId" = $1', [bolsistaId]);
        const relatorioAvaliacaoRes = await client.query('SELECT "relatorioId" FROM "relatorio_avaliacao" WHERE "bolsistaId" = $1', [bolsistaId]);
        const certificadoRes = await client.query('SELECT id FROM "certificado" WHERE "bolsistaId" = $1', [bolsistaId]);
        const certificadoIds = certificadoRes.rows.map((row) => row.id);

        relatorioAlunoRes.rows.forEach((row) => relatorioIdsToDelete.add(row.relatorioId));
        relatorioAvaliacaoRes.rows.forEach((row) => relatorioIdsToDelete.add(row.relatorioId));

        if (certificadoIds.length > 0) {
          const relatorioCertificadoRes = await client.query(
            'SELECT "relatorioId" FROM "relatorio_certificado" WHERE "certificadoId" = ANY($1::uuid[])',
            [certificadoIds]
          );
          relatorioCertificadoRes.rows.forEach((row) => relatorioIdsToDelete.add(row.relatorioId));
        }

        await client.query('DELETE FROM "relatorio_aluno" WHERE "bolsistaId" = $1', [bolsistaId]);
        await client.query('DELETE FROM "relatorio_avaliacao" WHERE "bolsistaId" = $1', [bolsistaId]);
        await client.query('DELETE FROM "relatorio_certificado" WHERE "certificadoId" IN (SELECT id FROM "certificado" WHERE "bolsistaId" = $1)', [bolsistaId]);
        await client.query('DELETE FROM "alocar_tutor_aluno" WHERE "bolsistaId" = $1', [bolsistaId]);
        await client.query('DELETE FROM "certificado" WHERE "bolsistaId" = $1', [bolsistaId]);
        await client.query('DELETE FROM "form_acompanhamento" WHERE "bolsistaId" = $1', [bolsistaId]);
      }

      if (tutorId) {
        const relatorioTutorRes = await client.query('SELECT "relatorioId" FROM "relatorio_tutor" WHERE "tutorId" = $1', [tutorId]);
        const relatorioAcompanhamentoRes = await client.query('SELECT "relatorioId" FROM "relatorio_acompanhamento" WHERE "tutorId" = $1', [tutorId]);

        relatorioTutorRes.rows.forEach((row) => relatorioIdsToDelete.add(row.relatorioId));
        relatorioAcompanhamentoRes.rows.forEach((row) => relatorioIdsToDelete.add(row.relatorioId));

        await client.query('DELETE FROM "relatorio_tutor" WHERE "tutorId" = $1', [tutorId]);
        await client.query('DELETE FROM "relatorio_acompanhamento" WHERE "tutorId" = $1', [tutorId]);
        await client.query('DELETE FROM "alocar_tutor_aluno" WHERE "tutorId" = $1', [tutorId]);
        await client.query('DELETE FROM "form_acompanhamento" WHERE "tutorId" = $1', [tutorId]);
      }

      if (relatorioIdsToDelete.size > 0) {
        await client.query('DELETE FROM "relatorio" WHERE id = ANY($1::uuid[])', [Array.from(relatorioIdsToDelete)]);
      }

      await client.query('DELETE FROM "avaliacao_tutoria" WHERE "usuarioId" = $1', [userId]);
      await client.query('DELETE FROM "notification" WHERE "userId" = $1', [userId]);

      if (coordenadorId) {
        await client.query('DELETE FROM "coordenador" WHERE id = $1', [coordenadorId]);
      }
      if (alunoId) {
        await client.query('DELETE FROM "aluno" WHERE id = $1', [alunoId]);
      }
      if (tutorId) {
        await client.query('DELETE FROM "tutor" WHERE id = $1', [tutorId]);
      }
      if (bolsistaId) {
        await client.query('DELETE FROM "bolsista" WHERE id = $1', [bolsistaId]);
      }

      await client.query('DELETE FROM "usuario" WHERE id = $1', [userId]);
      await client.query('COMMIT');

      console.log(`[Database] Usuário e dados vinculados removidos com sucesso: ${email}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[Database Error] Erro ao deletar usuário ${email}:`, err);
    } finally {
      client.release();
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
   * Garante a existência de um usuário base no banco para testes.
   */
  static async ensureUsuario(userId: string, fallbackName?: string, fallbackEmail?: string): Promise<void> {
    const userExists = await pool.query('SELECT id FROM "usuario" WHERE id = $1', [userId]);
    if (userExists.rows[0]?.id) {
      return;
    }

    const name = fallbackName || `Usuário E2E ${userId.slice(0, 8)}`;
    const email = fallbackEmail || `${userId.slice(0, 8)}@e2e.local`;

    await pool.query(
      `INSERT INTO "usuario" (id, nome, email, senha, status, "criadoEm", "atualizadoEm") 
       VALUES ($1, $2, $3, '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ATIVO', NOW(), NOW())`,
      [userId, name, email]
    );
  }

  /**
   * Garante a existência de um perfil de bolsista para um usuário.
   */
  static async ensureBolsista(userId: string): Promise<string> {
    await this.ensureUsuario(userId);

    const bolsistaRes = await pool.query('SELECT id FROM "bolsista" WHERE "usuarioId" = $1', [userId]);
    if (bolsistaRes.rows[0]?.id) {
      return bolsistaRes.rows[0].id;
    }

    const insertRes = await pool.query(
      `INSERT INTO "bolsista" (id, "usuarioId", "anoIngresso", curso) 
       VALUES (gen_random_uuid(), $1, 2024, 'Ciência da Computação') 
       RETURNING id`,
      [userId]
    );

    return insertRes.rows[0].id;
  }

  /**
   * Garante a existência de uma avaliação de tutoria para um usuário/período.
   */
  static async ensureAvaliacaoTutoria(usuarioId: string, periodoId: string, tipoAvaliador: string, conteudo: Record<string, any> = {}) {
    await this.ensureUsuario(usuarioId);

    const existing = await pool.query(
      'SELECT id FROM "avaliacao_tutoria" WHERE "usuarioId" = $1 AND "periodoId" = $2 AND "tipoAvaliador" = $3',
      [usuarioId, periodoId, tipoAvaliador]
    );

    if (existing.rows[0]?.id) {
      return existing.rows[0].id;
    }

    const insertRes = await pool.query(
      `INSERT INTO "avaliacao_tutoria" (id, "usuarioId", "periodoId", "tipoAvaliador", conteudo, status, "dataEnvio", "dataAtualizacao") 
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'RASCUNHO', NOW(), NOW()) 
       RETURNING id`,
      [usuarioId, periodoId, tipoAvaliador, JSON.stringify(conteudo)]
    );

    return insertRes.rows[0].id;
  }

  /**
   * Garante a existência de um Tutor com usuário e perfil criados.
   */
  static async ensureTutor(nome: string, email: string): Promise<string> {
    const userRes = await pool.query('SELECT id FROM "usuario" WHERE email = $1', [email]);
    let userId = userRes.rows[0]?.id;

    if (!userId) {
      // Hash bcrypt válido (60 chars) de 'SenhaForte123' para uso em testes
      const insertUser = await pool.query(
        `INSERT INTO "usuario" (id, nome, email, senha, status, "criadoEm", "atualizadoEm") 
         VALUES (gen_random_uuid(), $1, $2, '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ATIVO', NOW(), NOW())
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [nome, email]
      );
      if (insertUser.rows[0]?.id) {
        userId = insertUser.rows[0].id;
        console.log(`[Database] Usuário para tutor criado: ${email}`);
      } else {
        const existingUser = await pool.query('SELECT id FROM "usuario" WHERE email = $1', [email]);
        userId = existingUser.rows[0]?.id;
        if (!userId) {
          throw new Error(`[DbHelper] Falha ao obter id do usuário existente para tutor: ${email}`);
        }
        console.log(`[Database] Usuário tutor já existente recuperado para reutilização: ${email}`);
      }
    }

    const tutorRes = await pool.query('SELECT id FROM "tutor" WHERE "usuarioId" = $1', [userId]);
    let tutorId = tutorRes.rows[0]?.id;

    if (!tutorId) {
      // ON CONFLICT DO NOTHING previne duplicate key quando múltiplos browsers tentam criar o mesmo tutor em paralelo
      const insertTutor = await pool.query(
        `INSERT INTO "tutor" (id, "usuarioId", "capacidadeMaxima") 
         VALUES (gen_random_uuid(), $1, 5) 
         ON CONFLICT ("usuarioId") DO NOTHING
         RETURNING id`,
        [userId]
      );

      if (insertTutor.rows[0]?.id) {
        tutorId = insertTutor.rows[0].id;
        console.log(`[Database] Tutor criado e associado: ${email}`);
      } else {
        // Conflito ocorreu (outro worker criou antes) — busca o registro existente
        const existingTutor = await pool.query('SELECT id FROM "tutor" WHERE "usuarioId" = $1', [userId]);
        tutorId = existingTutor.rows[0]?.id;
        if (!tutorId) {
          throw new Error(`[DbHelper] Falha ao obter id do tutor existente para usuário: ${userId}`);
        }
        console.log(`[Database] Tutor já existente recuperado para reutilização: ${email}`);
      }
    }

    return tutorId;
  }

  /**
   * Vincula um Aluno (Bolsista) a um Tutor sob um Período de tutoria específico.
   */
  static async vinculaTutorBolsista(tutorId: string, emailBolsista: string, periodoId: string) {
    // 1. Obter ID do bolsista
    let userId = null;
    const userRes = await pool.query('SELECT id FROM "usuario" WHERE email = $1', [emailBolsista]);
    if (userRes.rows.length > 0) {
      userId = userRes.rows[0].id;
    } else {
      const nomeFallback = emailBolsista.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').trim() || 'Bolsista E2E';
      const insertUser = await pool.query(
        `INSERT INTO "usuario" (id, nome, email, senha, status, "criadoEm", "atualizadoEm")
         VALUES (gen_random_uuid(), $1, $2, '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ATIVO', NOW(), NOW())
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [nomeFallback, emailBolsista]
      );

      if (insertUser.rows[0]?.id) {
        userId = insertUser.rows[0].id;
        console.log(`[Database] Usuário bolsista criado via fallback para: ${emailBolsista}`);
      } else {
        const existingUser = await pool.query('SELECT id FROM "usuario" WHERE email = $1', [emailBolsista]);
        if (existingUser.rows.length === 0) {
          throw new Error(`Bolsista com email ${emailBolsista} não encontrado no banco.`);
        }
        userId = existingUser.rows[0].id;
      }
    }

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

    // 2. Validar que o tutor referenciado existe (previne FK violation em execução paralela)
    const tutorCheck = await pool.query('SELECT id FROM "tutor" WHERE id = $1', [tutorId]);
    if (tutorCheck.rows.length === 0) {
      throw new Error(
        `[DbHelper] FK violation prevention: Tutor com id "${tutorId}" não encontrado na tabela "tutor". ` +
        `Certifique-se de que ensureTutor() foi aguardado com sucesso antes de chamar vinculaTutorBolsista().`
      );
    }

    // 3. Verificar se já existe alocação
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
