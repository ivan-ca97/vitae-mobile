export type ShareScope = "collection" | "item";
export type ShareAudience = "user" | "public";

export interface Share {
  id: string;
  owner_id: string;
  permission: string;
  scope: ShareScope;
  resource_id?: string;
  audience: ShareAudience;
  grantee_id?: string;
  created_at: string;
  /** Si concede algo ahora: solo mientras el dueno siga teniendo el permiso. */
  active: boolean;
}

export interface ShareListResponse {
  items: Share[];
}

export interface CreateShareRequest {
  permission: string;
  scope?: ShareScope;
  resource_id?: string;
  audience?: ShareAudience;
  grantee_id?: string;
}

export interface UpdateShareRequest {
  audience: ShareAudience;
  grantee_id?: string;
}
