import { z } from 'zod';
import { UserSchema } from './userSchema';

/**
 * Schema para a resposta de Login.
 * Valida o token JWT e os dados básicos do usuário logado.
 */
export const LoginResponseSchema = z.object({
  token: z.string().min(10), // Garante que venha uma string de token plausível
  usuario: UserSchema,
});

export const LoginErrorSchema = z.object({
  error: z.string(),
});
