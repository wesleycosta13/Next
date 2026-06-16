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
    const rand = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const matriculaUnica = (timestamp.slice(-5) + rand.slice(-3)).padStart(8, '0');
    const cpfUnico = (timestamp.slice(-5) + rand.slice(-6)).padStart(11, '0');

    const nome = faker.person.fullName();
    
    // Normalização para slug de email (sem acentos, minúsculo, espaços -> ponto)
    const nomeSlug = nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
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
