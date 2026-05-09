import { Pool } from 'pg';
import * as path from 'path';

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function deleteUserByEmail(email: string) {
  try {
    await pool.query('DELETE FROM "usuario" WHERE email = $1', [email]);
  } catch (err) {
    console.error(`Erro ao deletar usuário ${email}:`, err);
  }
}

export async function closeConnection() {
  await pool.end();
}
