import { CreateUsuarioDTO } from '../dtos/CreateUserDTO';

export class CreateUserValidator {
    static validate(data: CreateUsuarioDTO): string | null {
        const error = (
            this.validarNome(data.nome) ||
            this.validarEmail(data.email) ||
            this.validarCPF(data.cpf) ||
            this.validarSenha(data.senha)
        );

        if (error) return error;

        if (data.bolsista) {
            return (
                this.validarAnoIngresso(data.bolsista.anoIngresso) ||
                this.validarCurso(data.bolsista.curso)
            );
        }

        return null;
    }

    static validarNome(nome?: string): string | null {
        if (!nome || nome.trim() === '') {
            return 'Preencha o campo nome';
        } else if (nome.trim().length < 3) {
            return 'O nome deve conter pelo menos 3 caracteres.';
        } else if (nome.trim().length > 100) {
            return 'O nome não pode exceder 100 caracteres.';
        }

        return null;
    }

    static validarEmail(email?: string): string | null {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email || email.trim() === '') {
            return 'Preencha o campo e-mail'
        } else if (!emailRegex.test(email)) {
            return 'E-mail inválido'
        }

        return null;
    }

    static validarCPF(cpf?: string): string | null {
        if (!cpf || cpf.trim() === '') {
            return 'Preencha o campo CPF';
        }

        const cleanCPF = cpf.replace(/\D/g, '');

        if (cleanCPF.length !== 11) {
            return 'O CPF deve conter 11 dígitos';
        }

        return null;
    }

    static validarAnoIngresso(anoIngresso?: number): string | null {
        const anoIngressoRegex = /^[0-9]{4}$/;

        if (!anoIngresso) {
            return 'Preencha o campo ano de ingresso';
        } else if (anoIngresso > new Date().getFullYear()) {
            return 'Ano de ingresso inválido';
        } else if (anoIngresso.toString().length !== 4) {
            return 'O ano de ingresso deve conter 4 dígitos';
        }

        if (!anoIngressoRegex.test(anoIngresso.toString())) {
            return 'O ano de ingresso deve conter 4 dígitos';
        }

        return null;
    }


    static validarCurso(curso?: string): string | null {
        const cursoRegex = /^[A-Za-zÀ-ÿ\s]+$/;

        if (!curso || curso.trim() === '') {
            return 'Preencha o campo curso';
        } else if (!cursoRegex.test(curso.trim())) {
            return 'O curso deve conter apenas letras';
        } else if (curso.trim().length < 10) {
            return 'O curso deve conter pelo menos 10 caracteres';
        }

        return null;
    }

    static validarSenha(senha?: string): string | null {
        if (!senha || senha.trim() === '') {
            return 'Preencha o campo senha';
        }

        if (senha.length < 6) {
            return 'A senha deve conter pelo menos 6 caracteres';
        }

        return null;
    }
}