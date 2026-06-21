export class CertificateValidator {
  static validate(data: {
    title?: string;
    description?: string;
    institution?: string;
    workload?: string | number;
    startDate?: string;
    endDate?: string;
    category?: string;
  }): string | null {
    // 1. Título
    if (data.title !== undefined && data.title !== null && data.title.trim() !== '') {
      if (!/^[a-zA-Z0-9À-ÿ\s]+$/.test(data.title)) {
        return 'O título deve conter apenas letras e números.';
      }
      if (data.title.length > 100) {
        return 'O título não pode exceder 100 caracteres.';
      }
    }

    // 2. Carga Horária
    if (data.workload !== undefined && data.workload !== null && data.workload !== '') {
      if (!/^\d{1,3}$/.test(data.workload.toString())) {
        return 'A carga horária deve conter apenas números, com no máximo 3 dígitos.';
      }
    }

    // 3. Instituição
    if (data.institution !== undefined && data.institution !== null && data.institution.trim() !== '') {
      if (!/^[a-zA-Z0-9À-ÿ\s]+$/.test(data.institution)) {
        return 'A instituição deve conter apenas letras e números.';
      }
      if (data.institution.length > 100) {
        return 'A instituição não pode exceder 100 caracteres.';
      }
    }

    // 4. Descrição
    if (data.description !== undefined && data.description !== null && data.description.trim() !== '') {
      if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(data.description)) {
        return 'A descrição deve conter apenas letras.';
      }
      if (data.description.length > 255) {
        return 'A descrição não pode exceder 255 caracteres.';
      }
    }

    // 5. Data de Início
    if (data.startDate !== undefined && data.startDate !== null && data.startDate.trim() !== '') {
      const err = this.validateDate(data.startDate, 'início');
      if (err) return err;
    }

    // 6. Data de Término
    if (data.endDate !== undefined && data.endDate !== null && data.endDate.trim() !== '') {
      const err = this.validateDate(data.endDate, 'término');
      if (err) return err;
    }

    // 7. Regra de Datas (Data de Início não pode ser maior que Data de Término)
    if (
      data.startDate !== undefined && data.startDate !== null && data.startDate.trim() !== '' &&
      data.endDate !== undefined && data.endDate !== null && data.endDate.trim() !== ''
    ) {
      const start = this.parseDate(data.startDate);
      const end = this.parseDate(data.endDate);
      if (start && end && start > end) {
        return 'A data de início não pode ser maior que a data de término.';
      }
    }

    return null;
  }

  static validateDate(dateStr: string, fieldName: string): string | null {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      return `A data de ${fieldName} deve estar no formato dd/mm/aaaa.`;
    }
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return `A data de ${fieldName} não é uma data real válida.`;
    }
    return null;
  }

  static parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
        return date;
      }
    }
    // Fallback parser if we get an ISO string or YYYY-MM-DD from tests/other components
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const parts = dateStr.split('T')[0].split('-');
      const year = Number(parts[0]);
      const month = Number(parts[1]);
      const day = Number(parts[2]);
      const date = new Date(year, month - 1, day);
      if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
        return date;
      }
    }
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    return null;
  }
}
