import { fakerPT_BR as faker } from '@faker-js/faker';

export interface UserData {
  nome: string;
  matricula: string;
  email: string;
  cpf: string;
}

export function gerarDadosUsuario(): UserData {
  const timestamp = Date.now().toString();
  // Pega os últimos 8 dígitos do timestamp para a matrícula
  const matriculaUnica = timestamp.slice(-8);
  // Pega os últimos 11 dígitos do timestamp para o CPF (ou preenche com zeros)
  const cpfUnico = timestamp.padStart(11, '0').slice(-11);

  return {
    nome: faker.person.fullName(),
    matricula: matriculaUnica,
    // Email único baseado no timestamp
    email: `teste_${timestamp}@exemplo.com`,
    cpf: cpfUnico
  };
}
