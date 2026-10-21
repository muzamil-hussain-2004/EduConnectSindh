import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/shared/utils/password';
import { hashToken, parseDurationMs } from '../../src/shared/utils/token';

describe('password hashing', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('Secret123');

    expect(hash).not.toContain('Secret123');
    expect(await verifyPassword(hash, 'Secret123')).toBe(true);
    expect(await verifyPassword(hash, 'secret123')).toBe(false);
  });
});

describe('token helpers', () => {
  it('hashes tokens deterministically and never returns the input', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
    expect(hashToken('abc')).not.toContain('abc');
  });

  it('parses durations', () => {
    expect(parseDurationMs('30s')).toBe(30_000);
    expect(parseDurationMs('15m')).toBe(900_000);
    expect(parseDurationMs('7d')).toBe(604_800_000);
    expect(() => parseDurationMs('soon')).toThrow();
  });
});
