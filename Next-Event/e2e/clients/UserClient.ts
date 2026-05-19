import { APIRequestContext, APIResponse, expect } from '@playwright/test';
import { z } from 'zod';

export class UserClient {
  constructor(private request: APIRequestContext) {}

  /**
   * Cria um novo usuário via API.
   * @param payload Dados do usuário
   * @param schema Schema opcional para validação de contrato imediata
   */
  async createUser(payload: any, schema?: z.ZodSchema): Promise<APIResponse> {
    const response = await this.request.post('/api/users', {
      data: payload,
    });

    if (schema && response.ok()) {
      const body = await response.json();
      const validation = schema.safeParse(body);
      
      if (!validation.success) {
        const errors = JSON.stringify(validation.error.format(), null, 2);
        throw new Error(`API Response does not match the expected contract schema:\n${errors}`);
      }
    }

    return response;
  }

  /**
   * Realiza login via API.
   */
  async login(payload: any, schema?: z.ZodSchema): Promise<APIResponse> {
    const response = await this.request.post('/api/users/login', {
      data: payload,
    });

    if (schema && response.ok()) {
      const body = await response.json();
      const validation = schema.safeParse(body);
      
      if (!validation.success) {
        const errors = JSON.stringify(validation.error.format(), null, 2);
        throw new Error(`API Response does not match the expected contract schema:\n${errors}`);
      }
    }

    return response;
  }
}

