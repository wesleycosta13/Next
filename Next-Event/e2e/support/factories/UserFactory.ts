import { fakerPT_BR as faker } from '@faker-js/faker';

export interface UserData {
  nome: string;
  matricula: string;
  email: string;
  cpf: string;
}

export class UserFactory {
  /**
   * Gera um conjunto de dados de usuário aleatórios e válidos.
   * Centraliza a lógica de geração de massa dinâmica.
   */
  static generateUser(): UserData {
    const timestamp = Date.now().toString();
    const matriculaUnica = timestamp.slice(-8);
    const cpfUnico = timestamp.padStart(11, '0').slice(-11);

    const nome = faker.person.fullName();
    
    // Normalização para slug de email (sem acentos, minúsculo, espaços -> ponto)
    const nomeSlug = nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '.')
      .toLowerCase();

    return {
      nome,
      matricula: matriculaUnica,
      email: `${nomeSlug}${timestamp}@test.com`,
      cpf: cpfUnico,
    };
  }
}
