export interface User {
  id: string;
  email: string;
  username?: string;
  /** Si aparece cuando otros buscan usuarios para compartir. */
  discoverable: boolean;
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
  discoverable?: boolean;
  password?: string;
  height_cm?: number;
  birth_date?: string;
  sex?: string;
}

/** Lo unico que se ve de otro usuario: su id y su username. */
export interface PublicUser {
  id: string;
  username?: string;
}
