//********** START: API Request / Response Types **********
//********** END: API Request / Response Types **********

//********** Auth **********

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user: {
    id: string;
    username: string;
  };
  token?: string; //********** Only present if not using httpOnly cookies
}

//********** Generic API Envelope **********

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
