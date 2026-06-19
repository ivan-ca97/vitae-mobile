export interface DailyPhoto {
  id: string;
  date: string;
  url: string;
  name: string;
  is_primary: boolean;
  created_at: string;
}

export interface DailyPhotoListResponse {
  items: DailyPhoto[];
}

export interface CreateDailyPhotoRequest {
  date: string;
  url: string;
  name?: string;
  is_primary?: boolean;
}

export interface UpdateDailyPhotoRequest {
  name?: string;
  is_primary?: boolean;
}
