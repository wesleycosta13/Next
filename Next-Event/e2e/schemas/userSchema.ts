import { z } from 'zod';

/**
 * Definição dos Schemas da API para Contract Testing.
 * Garante que a estrutura da resposta da API não mude sem aviso.
 */

export const UserSchema = z.object({
  id: z.string().uuid().optional(), // Depende se a API retorna UUID ou Number
  nome: z.string().min(1),
  email: z.string().email(),
  matricula: z.string().optional(),
  cpf: z.string().optional(),
});

export const RegisterResponseSchema = z.object({
  usuario: UserSchema,
});

export const ErrorResponseSchema = z.object({
  errors: z.array(z.string()).optional(),
  message: z.string().optional(),
});
