// Public path of a profile picture. The stored file name changes on every upload, so a slice of it
// doubles as a cache-busting version.
export const avatarUrlFor = (userId: string, avatarFile: string | null | undefined) =>
  avatarFile ? `/users/${userId}/avatar?v=${avatarFile.slice(0, 8)}` : null;
