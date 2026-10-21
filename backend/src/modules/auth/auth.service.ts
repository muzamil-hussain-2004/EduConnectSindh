import { env } from '../../config/env';
import type { User } from '../../database/generated/prisma/client';
import { AppError } from '../../shared/errors/AppError';
import { hashPassword, verifyPassword } from '../../shared/utils/password';
import {
  generateRefreshToken,
  hashToken,
  parseDurationMs,
  signAccessToken,
} from '../../shared/utils/token';
import { toPublicUser, usersService } from '../users/users.service';
import { authRepository } from './auth.repository';
import type { LoginInput, RegisterInput } from './auth.schema';

// Verified against when the email is unknown, so response time does not reveal which emails exist.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword('not-a-real-password-0'));

async function issueTokens(user: User) {
  const refreshToken = generateRefreshToken();
  await authRepository.createRefreshToken({
    tokenHash: hashToken(refreshToken),
    userId: user.id,
    expiresAt: new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN)),
  });
  return {
    user: toPublicUser(user),
    accessToken: signAccessToken(user),
    refreshToken,
  };
}

function isUniqueViolation(err: unknown) {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002';
}

export const authService = {
  async register(input: RegisterInput) {
    if (await usersService.findByEmail(input.email)) {
      throw AppError.conflict('An account with this email already exists');
    }

    const { password, ...profile } = input;
    const passwordHash = await hashPassword(password);
    try {
      const user = await usersService.create({ ...profile, passwordHash });
      return await issueTokens(user);
    } catch (err) {
      // Two simultaneous registrations with the same email.
      if (isUniqueViolation(err)) {
        throw AppError.conflict('An account with this email already exists');
      }
      throw err;
    }
  },

  async login(input: LoginInput) {
    const user = await usersService.findByEmail(input.email);
    const passwordOk = await verifyPassword(
      user?.passwordHash ?? (await getDummyHash()),
      input.password,
    );

    if (!user || !passwordOk) {
      throw AppError.unauthorized('Invalid email or password');
    }
    if (user.status !== 'ACTIVE') {
      throw AppError.forbidden('This account is suspended');
    }
    return issueTokens(user);
  },

  // Rotation: every refresh token works once. Presenting a used one means it was stolen,
  // so every session of that user is revoked.
  async refresh(rawToken: string | undefined) {
    if (!rawToken) throw AppError.unauthorized('Missing refresh token');

    const record = await authRepository.findRefreshToken(hashToken(rawToken));
    if (!record) throw AppError.unauthorized('Invalid refresh token');

    if (record.revokedAt) {
      await authRepository.revokeAllForUser(record.userId);
      throw AppError.unauthorized('Refresh token reuse detected, please log in again');
    }
    if (record.expiresAt <= new Date()) {
      throw AppError.unauthorized('Refresh token expired, please log in again');
    }
    if (record.user.status !== 'ACTIVE') {
      throw AppError.forbidden('This account is suspended');
    }

    // Lost the race against a parallel request using the same token: treat as reuse.
    if ((await authRepository.revokeRefreshToken(record.id)) === 0) {
      await authRepository.revokeAllForUser(record.userId);
      throw AppError.unauthorized('Refresh token reuse detected, please log in again');
    }
    return issueTokens(record.user);
  },

  async logout(rawToken: string | undefined) {
    if (!rawToken) return;
    const record = await authRepository.findRefreshToken(hashToken(rawToken));
    if (record) await authRepository.revokeRefreshToken(record.id);
  },

  async me(userId: string) {
    return toPublicUser(await usersService.getById(userId));
  },
};
