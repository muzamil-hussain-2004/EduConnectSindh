import { Camera, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';
import { useAppSelector } from '@/app/hooks';
import { Avatar } from '@/components/ui/Avatar';
import { useRemoveAvatarMutation, useUploadAvatarMutation } from '@/features/auth/authApi';
import { getErrorMessage } from '@/services/api/baseApi';

const MAX_BYTES = 2 * 1024 * 1024;

/** Click the picture to change it. Profile pictures are public, so say so. */
export function AvatarUploader() {
  const user = useAppSelector((s) => s.auth.user);
  const input = useRef<HTMLInputElement>(null);
  const [upload, { isLoading }] = useUploadAvatarMutation();
  const [remove, { isLoading: removing }] = useRemoveAvatarMutation();
  if (!user) return null;

  const onPick = async (file?: File) => {
    if (!file) return;
    if (!/^image\/(jpeg|png)$/.test(file.type)) return toast.error('Choose a JPG or PNG image');
    if (file.size > MAX_BYTES) return toast.error('Image must be 2 MB or smaller');
    try {
      await upload(file).unwrap();
      toast.success('Profile picture updated');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={isLoading}
        aria-label="Change profile picture"
        className="group relative rounded-full focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
      >
        <Avatar name={user.fullName} src={user.avatarUrl} size="lg" />
        <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          <Camera className="size-5" />
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg"
        hidden
        onChange={(e) => {
          void onPick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <div className="min-w-0">
        <p className="truncate font-semibold">{user.fullName}</p>
        <p className="text-xs text-muted capitalize">{user.role.toLowerCase()}</p>
        {user.avatarUrl && (
          <button
            type="button"
            disabled={removing}
            onClick={() => remove()}
            className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted hover:text-danger"
          >
            <Trash2 className="size-3" /> Remove photo
          </button>
        )}
      </div>
    </div>
  );
}
