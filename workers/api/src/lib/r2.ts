import { Env } from '../../../shared/types.js';

const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export async function uploadMedia(
  env: Env,
  memberId: string,
  file: File
): Promise<{ r2_key: string; url: string; size_bytes: number; media_type: string }> {
  if (!ALLOWED_MEDIA_TYPES.includes(file.type as any)) {
    throw new Error('Unsupported media type');
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('File too large');
  }
  const ext = file.name.split('.').pop() || 'jpg';
  const uuid = crypto.randomUUID();
  const r2_key = `members/${memberId}/posts/${uuid}.${ext}`;
  await env.MEDIA_BUCKET.put(r2_key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });
  return {
    r2_key,
    url: `https://media.alphaminds.com/${r2_key}`,
    size_bytes: file.size,
    media_type: file.type,
  };
}
