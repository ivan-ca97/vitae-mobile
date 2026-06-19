export interface User {
  id: string;
  email: string;
  username?: string;
  active: boolean;
  height_cm?: number;
  birth_date?: string;
  sex?: string;
  photo_url: string;
  created_at: string;
}

export interface UpdateUserRequest {
  email?: string;
  username?: string;
  password?: string;
  height_cm?: number;
  birth_date?: string;
  sex?: string;
}
