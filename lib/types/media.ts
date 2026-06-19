export interface UploadURLRequest {
  filename: string;
  content_type: string;
}

export interface UploadURLResponse {
  upload_url: string;
  public_url: string;
}
