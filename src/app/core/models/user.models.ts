/** User profile returned by GET /api/v1/users/{id} */
export interface UserProfile {
  id: string;
  email: string;
  userName: string;
  fullName: string | null;
  emailConfirmed: boolean;
  twoFactorEnabled: boolean;
  lockoutEnd: string | null;
  lockoutEnabled: boolean;
  accessFailedCount: number;
  roles: string[];
}

/** Payload for PUT /api/v1/users/{id}/profile */
export interface UpdateProfileRequest {
  fullName: string | null;
  userName: string;
}

/** Payload for PUT /api/v1/users/{id}/password */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}