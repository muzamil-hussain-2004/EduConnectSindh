import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from './auth.schemas';

describe('registerSchema', () => {
  const valid = {
    fullName: 'Ali Khan',
    email: 'ali@example.com',
    phone: '03001234567',
    password: 'Passw0rdX',
    role: 'STUDENT',
  };

  it('accepts valid input and an empty phone', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
    expect(registerSchema.safeParse({ ...valid, phone: '' }).success).toBe(true);
  });

  it('rejects weak passwords and bad phones', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'short1' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, password: 'onlyletters' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, phone: '12345' }).success).toBe(false);
  });

  it('does not allow ADMIN to self-register', () => {
    expect(registerSchema.safeParse({ ...valid, role: 'ADMIN' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('requires a valid email and password', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});
