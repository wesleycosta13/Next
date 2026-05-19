import { UserFactory } from '../support/factories/UserFactory';

/**
 * Builder para payloads de usuário.
 * Facilita a criação de massas de teste com overrides específicos.
 */
export function buildUserPayload(overrides: any = {}) {
  const baseUser = UserFactory.generateUser();
  
  return {
    nome: baseUser.nome,
    email: baseUser.email,
    senha: 'SenhaForte123',
    matricula: baseUser.matricula,
    cpf: baseUser.cpf,
    status: 'ATIVO',
    bolsista: {
      anoIngresso: 2023,
      curso: 'Ciência da Computação',
      ...(overrides.bolsista || {})
    },
    ...overrides
  };
}
