/** Request body for POST /api/v1/auth/login */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Request body for POST /api/v1/auth/register */
export interface RegisterRequest {
  email: string;
  userName: string;
  password: string;
}

/**
 * Response from login, register, and refresh endpoints.
 * The backend may return the JWT as either `token` or `accessToken`.
 */
export interface AuthResponse {
  token?: string;
  accessToken?: string;
}

/** Decoded JWT payload (subset of standard claims used by the app). */
export interface JwtPayload {
  sub: string;
  email: string;
  unique_name: string;
  name?: string;
  role: string | string[];
  exp: number;
  iat: number;
  [key: string]: unknown;
}
