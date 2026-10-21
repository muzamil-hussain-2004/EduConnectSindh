export const env = {
  apiUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1',
  socketUrl: (import.meta.env.VITE_SOCKET_URL as string | undefined) ?? '',
};
