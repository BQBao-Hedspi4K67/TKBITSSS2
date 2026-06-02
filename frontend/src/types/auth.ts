export type Role = 'STUDENT';

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  studentCode: string | null;
  role: Role;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};
