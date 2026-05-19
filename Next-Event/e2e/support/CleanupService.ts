import { DbHelper } from './database/dbHelper';

/**
 * CleanupService gerencia uma pilha de itens que precisam ser removidos após os testes.
 * Evita que o banco fique sujo em caso de falhas e resolve o problema de múltiplas deleções.
 */
export class CleanupService {
  private emailsToDelete: Set<string> = new Set();

  /**
   * Registra um email para ser removido no final do teste.
   */
  addEmail(email: string) {
    this.emailsToDelete.add(email);
  }

  /**
   * Executa a limpeza de todos os itens registrados.
   */
  async cleanup() {
    const emails = Array.from(this.emailsToDelete);
    if (emails.length === 0) return;

    console.log(`[Cleanup] Iniciando limpeza de ${emails.length} registro(s)...`);
    
    // Executa as deleções em paralelo para maior performance
    await Promise.all(
      emails.map((email) => DbHelper.deleteUserByEmail(email))
    );

    this.emailsToDelete.clear();
  }
}
