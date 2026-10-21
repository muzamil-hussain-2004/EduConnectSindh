import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    // Defaults let tests run on a fresh clone / CI without a .env file.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.DATABASE_URL ??
        'postgresql://educonnect:change_me@localhost:5433/educonnect?schema=public',
      REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
      JWT_ACCESS_SECRET:
        process.env.JWT_ACCESS_SECRET ?? 'test_access_secret_at_least_32_characters_long',
      JWT_REFRESH_SECRET:
        process.env.JWT_REFRESH_SECRET ?? 'test_refresh_secret_at_least_32_characters_long',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/database/generated/**', 'src/server.ts', 'src/database/seeds/**'],
    },
  },
});
