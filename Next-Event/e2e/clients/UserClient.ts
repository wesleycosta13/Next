import { APIRequestContext, APIResponse } from '@playwright/test';

export class UserClient {
  constructor(private request: APIRequestContext) {}

  async createUser(payload: any): Promise<APIResponse> {
    return this.request.post('/api/users', {
      data: payload,
    });
  }
}
