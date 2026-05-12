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

  const nome = faker.person.fullName();
  // Normaliza o nome para criar um slug de email válido:
  // remove acentos, substitui espaços por ponto e converte para minúsculas
  const nomeSlug = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.')
    .toLowerCase();

  return {
    nome,
    matricula: matriculaUnica,
    // Email único baseado no nome + timestamp (garante unicidade)
    email: `${nomeSlug}${timestamp}@test.com`,
    cpf: cpfUnico
  };
}
