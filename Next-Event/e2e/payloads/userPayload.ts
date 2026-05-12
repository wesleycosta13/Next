import { gerarDadosUsuario } from '../utils/dataFactory';

export function buildUserPayload(overrides: Record<string, any> = {}) {
  const baseUser = gerarDadosUsuario();
  
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
