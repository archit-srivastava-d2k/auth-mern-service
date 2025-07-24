import bcrypt from "bcryptjs";
export class CredentialService {
  async comparePassword(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    return await bcrypt.compare(password, passwordHash);
  }
}
