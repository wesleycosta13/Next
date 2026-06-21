export function formatCPF(val) {
    if (!val) {
        return '';
    }

    let cpf = val.replace(/\D/g, '').slice(0, 11);

    cpf = cpf
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');

    return cpf;
}

export function formatAdmisionYear(val) {
    if (!val) {
        return '';
    }   

    let admissionYear = val.replace(/\D/g, '').slice(0, 4);

    return admissionYear;
}

export function formatWorkload(val) {
    if (!val) {
        return '';
    }

    let workload = val.replace(/\D/g, '').slice(0, 3);

    return workload;
}