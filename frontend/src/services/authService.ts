import { request } from './api';
import type { AuthUser, LoginResponse } from '../types/auth';

type MeResponse = {
  user: AuthUser | null;
};

export async function login(login: string, password: string) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
  });
}

export async function logout() {
  return request<{ success: boolean }>('/auth/logout', {
    method: 'POST',
  });
}

export async function me() {
  return request<MeResponse>('/auth/me');
}
