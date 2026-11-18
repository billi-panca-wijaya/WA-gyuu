export interface ApiMeta {
  request_id: string;
  server_time: string;
}

export interface ApiResponse<T = any> {
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  retryable?: boolean;
  attempts_remaining?: number;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
  meta: {
    request_id: string;
    server_time?: string;
  };
}
