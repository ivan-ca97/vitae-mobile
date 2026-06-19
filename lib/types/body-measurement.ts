export interface BodyMeasurement {
  date: string;
  type: string;
  value: number;
  notes: string;
  updated_at: string;
}

export interface UpsertBodyMeasurementRequest {
  value: number;
  notes?: string;
}
