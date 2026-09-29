import { Env } from '../../../shared/types.js';

const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/ogg', 'video/3gpp', 'video/mpeg'] as const;
const MAX_FILE_SIZE = 90 * 1024 * 1024;

export async function uploadMedia(
  env: Env,
  memberId: string,
  file: File
): Promise<{ r2_key: string; url: string; size_bytes: number; media_type: string }> {
  if (!ALLOWED_MEDIA_TYPES.includes(file.type as any)) {
    throw new Error('Unsupported media type');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large (max 90MB)');
  }
  const ext = file.name.split('.').pop() || 'jpg';
  const uuid = crypto.randomUUID();
  const r2_key = `members/${memberId}/posts/${uuid}.${ext}`;
  await env.MEDIA_BUCKET.put(r2_key, file.stream() as any, {
    httpMetadata: { contentType: file.type },
  });
  return {
    r2_key,
    url: `/v1/media/${r2_key}`,
    size_bytes: file.size,
    media_type: file.type,
  };
}
