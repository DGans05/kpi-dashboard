import { apiRequest, postRequest, getRequest } from './client';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'manager' | 'viewer';
  restaurantId: string | null;
  isActive: boolean;
  restaurant?: {
    id: string;
    name: string;
    location: string;
  };
}

export interface LoginResponse {
  user: User;
  message: string;
}

export function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return postRequest<LoginResponse, { email: string; password: string }>(
    '/api/auth/login',
    { email, password },
  );
}

export function logout(): Promise<void> {
  // Backend uses cookie-based auth; body not required
  return postRequest<void, undefined>('/api/auth/logout');
}

export function getCurrentUser(): Promise<User> {
  return getRequest<User>('/api/auth/me');
}

