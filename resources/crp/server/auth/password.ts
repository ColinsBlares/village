import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs') as {
  hashSync(value: string, salt: string): string;
  compareSync(value: string, hash: string): boolean;
  genSaltSync(rounds: number): string;
};

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
}

export function checkPassword(password: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(password, hash);
  } catch {
    return false;
  }
}
