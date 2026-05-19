import { APIRequestContext, APIResponse } from '@playwright/test';

export class AvaliacaoClient {
  constructor(private request: APIRequestContext) {}

  /**
   * Envia uma avaliação de tutoria
   */
  async createAvaliacao(token: string, payload: {
    periodoId: string;
    tipoAvaliador: 'ALUNO' | 'TUTOR';
    aspectosPositivos: string[];
    aspectosNegativos: string[];
    sugestoesMelhorias: string[];
    comentarioGeral: string;
    dificuldadesComunicacao: string;
    dificuldadesConteudo: string;
    dificuldadesMetodologicas: string;
    dificuldadesRecursos: string;
    outrasDificuldades: string;
    nivelSatisfacaoGeral: 'MUITO_INSATISFEITO' | 'INSATISFEITO' | 'NEUTRO' | 'SATISFEITO' | 'MUITO_SATISFEITO';
    recomendariaPrograma: boolean;
    justificativaRecomendacao: string;
    periodoAvaliado: string;
  }): Promise<APIResponse> {
    return await this.request.post('/api/avaliacao-tutoria', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: payload,
    });
  }

  /**
   * Lista as próprias avaliações
   */
  async listMyAvaliacoes(token: string): Promise<APIResponse> {
    return await this.request.get('/api/avaliacao-tutoria/minhas', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  /**
   * Lista todas as avaliações do período (apenas Coordenadores)
   */
  async listAllAvaliacoes(token: string): Promise<APIResponse> {
    return await this.request.get('/api/avaliacao-tutoria', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }
}
