import { APIRequestContext, APIResponse } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export class CertificateClient {
  constructor(private request: APIRequestContext) {}

  /**
   * Upload de um certificado via API (multipart/form-data)
   */
  async uploadCertificate(token: string, filePath: string, details: {
    titulo?: string;
    categoria: 'EVENTOS' | 'MONITORIA' | 'ESTUDOS_INDIVIDUAIS';
    startDate?: string;
    endDate?: string;
    horas?: string;
    instituicao?: string;
    descricao?: string;
  }): Promise<APIResponse> {
    const fileBuffer = fs.readFileSync(filePath);
    
    // Constrói os campos do multipart com os nomes esperados pela API do backend
    const multipartData: Record<string, any> = {
      file: {
        name: path.basename(filePath),
        mimeType: filePath.endsWith('.pdf') ? 'application/pdf' : 'image/png',
        buffer: fileBuffer,
      },
      category: details.categoria,
    };

    if (details.titulo) multipartData.title = details.titulo;
    if (details.startDate) multipartData.startDate = details.startDate;
    if (details.endDate) multipartData.endDate = details.endDate;
    if (details.horas) multipartData.workload = details.horas;
    if (details.instituicao) multipartData.institution = details.instituicao;
    if (details.descricao) multipartData.description = details.descricao;

    return await this.request.post('/api/certificates/upload', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      multipart: multipartData,
    });
  }

  /**
   * Listagem de certificados do usuário
   */
  async listUserCertificates(token: string, userId: string): Promise<APIResponse> {
    return await this.request.get(`/api/certificates/user/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  /**
   * Deletar certificado
   */
  async deleteCertificate(token: string, id: string): Promise<APIResponse> {
    return await this.request.delete(`/api/certificates/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  /**
   * Atualizar status do certificado (Coordenador / Admin)
   */
  async updateStatus(token: string, id: string, status: 'approved' | 'rejected'): Promise<APIResponse> {
    return await this.request.patch(`/api/certificates/${id}/status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      data: {
        status,
      },
    });
  }
}
