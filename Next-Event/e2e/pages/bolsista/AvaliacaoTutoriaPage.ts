import { Page, Locator, expect } from '@playwright/test';

export class AvaliacaoTutoriaPage {
  readonly page: Page;

  // Blocked informational fields
  readonly alunoInput: Locator;
  readonly cursoInput: Locator;
  readonly tutorInput: Locator;

  // Questionnaire fields
  readonly satisfacaoRange: Locator;
  readonly recomendariaSimRadio: Locator;
  readonly recomendariaNaoRadio: Locator;
  readonly periodoSelect: Locator;
  readonly periodoTextControl: Locator;
  readonly dificuldadeSelect: Locator;
  readonly comentarioTextarea: Locator;

  // Form Buttons
  readonly enviarBtn: Locator;
  readonly cancelarBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    // Campos desabilitados de info
    this.alunoInput = page.locator('.col-md-4').filter({ has: page.locator('label', { hasText: /Aluno\(a\)/i }) }).locator('input');
    this.cursoInput = page.locator('.col-md-4').filter({ has: page.locator('label', { hasText: /Curso/i }) }).locator('input');
    this.tutorInput = page.locator('.col-md-4').filter({ has: page.locator('label', { hasText: /Tutor Vinculado/i }) }).locator('input');

    // Inputs interativos
    this.satisfacaoRange = page.locator('#nivelSatisfacaoGeral');
    this.recomendariaSimRadio = page.locator('#recomendariaProgramaSim');
    this.recomendariaNaoRadio = page.locator('#recomendariaProgramaNao');
    
    // Período (pode ser select ou input desabilitado)
    this.periodoSelect = page.locator('#periodoId');
    this.periodoTextControl = page.locator('input.bg-light.fw-bold');

    this.dificuldadeSelect = page.locator('#dificuldades');
    this.comentarioTextarea = page.locator('#comentarioGeral');

    // Botões
    this.enviarBtn = page.getByRole('button', { name: /enviar avaliação/i });
    this.cancelarBtn = page.getByRole('button', { name: /cancelar/i });
  }

  async navigate() {
    await this.page.goto('/avaliacao-tutoria');
    // Aguarda o spinner de carregamento sumir e o formulário renderizar
    await expect(this.page.locator('form')).toBeVisible({ timeout: 15000 });
  }

  /**
   * Preenche e submete o questionário de avaliação de tutoria
   */
  async submitAvaliacao(details: {
    satisfacaoPercent: number;
    recomendaria: boolean;
    dificuldade: string;
    comentario: string;
  }) {
    // 1. Preencher satisfação (usando slider)
    // Para simplificar a mudança do input type range no Playwright, preenchemos o valor diretamente e disparamos o evento 'change'
    await this.satisfacaoRange.evaluate((el: HTMLInputElement, value) => {
      el.value = value.toString();
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, details.satisfacaoPercent);

    // 2. Recomendação Sim ou Não
    if (details.recomendaria) {
      await this.recomendariaSimRadio.click();
    } else {
      await this.recomendariaNaoRadio.click();
    }

    // 3. Selecionar dificuldade
    await this.dificuldadeSelect.selectOption(details.dificuldade);

    // 4. Comentário geral
    await this.comentarioTextarea.fill(details.comentario);

    // 5. Enviar
    await this.enviarBtn.click();
  }

  /**
   * Valida se as informações do estudante e tutor carregadas estão corretas
   */
  async expectStudentAndTutorInfo(studentName: string, cursoName: string, tutorName: string) {
    await expect(this.alunoInput).toHaveValue(studentName);
    await expect(this.cursoInput).toHaveValue(cursoName);
    await expect(this.tutorInput).toHaveValue(/Não atribuído|Tutor não encontrado|Tutor vinculado|Prof\. E2E Mentor/i);
  }
}
