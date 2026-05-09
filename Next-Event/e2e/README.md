# Next Event - E2E Tests 🎭

Este repositório contém a suíte de testes automatizados End-to-End (E2E) profissional para o sistema **Next Event**. A arquitetura foi projetada para ser escalável, utilizando as melhores práticas de mercado com [Playwright](https://playwright.dev/) e TypeScript.

## 📋 Pré-requisitos

Antes de executar os testes localmente, você precisará ter instalado:

- [Node.js](https://nodejs.org/en/) (versão LTS recomendada)
- [Docker](https://www.docker.com/) e Docker Compose (para subir a infraestrutura completa local ou no CI/CD)

## 🚀 Instalação

1. Clone o repositório e acesse a pasta do projeto:
   ```bash
   git clone <url-do-repositorio>
   cd next-event-e2e-tests
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Instale os navegadores do Playwright:
   ```bash
   npx playwright install --with-deps
   ```

## 📂 Estrutura do Projeto (Arquitetura Sênior)

O projeto segue o padrão **Page Object Model (POM)** com **Custom Fixtures** para injeção de dependência e isolamento total de estado:

```text
next-event-e2e-tests/
├── fixtures/
│   └── testBase.ts         # Custom Fixture (Injeta Pages e gerencia Teardown)
├── pages/
│   └── auth/
│       └── RegisterPage.ts # Page Object com locators e ações
├── tests/
│   └── auth/
│       └── register.spec.ts # Suíte de testes limpa usando Fixtures
├── utils/
│   ├── dataFactory.ts      # Geração de massa dinâmica com Faker.js
│   └── dbHelper.ts         # Auxiliares de Banco de Dados (PostgreSQL)
├── playwright.config.ts     # Configurações globais e baseURL
└── package.json             # Scripts e dependências
```

## 💻 Executando os Testes

Certifique-se de que a aplicação está rodando (usualmente na porta `:4000`) antes de iniciar.

| Comando | Descrição |
| :--- | :--- |
| `npm run test` | Executa todos os testes em modo headless. |
| `npm run test:ui` | Abre a interface interativa (UI Mode) para debug. |
| `npm run test:ci` | Roda os testes otimizados para o ambiente de CI (Chromium). |
| `npm run report` | Abre o último relatório HTML gerado. |

### Rodar por tags
Você pode rodar grupos específicos de testes usando as tags implementadas:
```bash
npx playwright test --grep @smoke
npx playwright test --grep @regression
```

## ✨ Boas Práticas Adotadas

- **Page Object Model (POM)**: Separação clara entre a lógica do teste e a estrutura da página.
- **Custom Fixtures**: Injeção automática de classes e gerenciamento de teardown (ex: limpeza de banco de dados após cada teste) de forma isolada e paralelizável.
- **Massa de Dados Dinâmica**: Uso do **Faker.js** para gerar dados realistas e únicos, evitando conflitos de banco.
- **BaseURL Dinâmico**: Configuração centralizada para fácil troca entre ambientes (Local, Staging, Produção).

## 🔄 Integração Contínua (CI/CD)

Configurado via **GitHub Actions** (`playwright.yml`). O pipeline sobe o ambiente via Docker Compose, aguarda a disponibilidade do serviço e executa a suite de testes, gerando um artefato com o relatório HTML em caso de falha.
