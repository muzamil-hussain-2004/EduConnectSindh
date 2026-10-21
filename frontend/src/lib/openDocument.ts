import { store } from '@/app/store';
import { env } from '@/config/env';

/** The file endpoint needs the Bearer token, so a plain link would fail: fetch a blob and open it. */
export async function openDocument(id: string) {
  const win = window.open('', '_blank');
  try {
    const res = await fetch(`${env.apiUrl}/verification/documents/${id}/file`, {
      headers: { Authorization: `Bearer ${store.getState().auth.accessToken}` },
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Could not load document');
    const url = URL.createObjectURL(await res.blob());
    if (win) win.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    win?.close();
    throw e;
  }
}
