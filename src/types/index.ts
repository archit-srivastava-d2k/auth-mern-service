// types.ts
export interface userData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

import { Request } from "express";
export interface RegisterRequest extends Request {
  body: userData;
}

export interface AuthRequest extends Request {
  auth: {
    sub: string;
    role: string;
    id?: string;
  };
}
export type AuthCookie = {
  accessToken: string;
  refreshToken: string;
};

export interface IrefreshToken {
  id: string;
}

export interface Itenant {
  name: string;
  address: string;
}
