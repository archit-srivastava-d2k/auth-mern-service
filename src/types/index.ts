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
