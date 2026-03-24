import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * S3-compatible object storage (Cloudflare R2, AWS S3, MinIO, etc.).
 * When configured, uploads go to the bucket and the DB stores a full public https URL.
 *
 * R2 (free tier): https://developers.cloudflare.com/r2/get-started/
 * Create bucket → API token (Object Read & Write) → Public R2.dev subdomain or custom domain.
 */
let client: S3Client | null = null;

export function isObjectStorageConfigured(): boolean {
  return Boolean(
    process.env.S3_BUCKET?.trim() &&
      process.env.S3_ENDPOINT?.trim() &&
      process.env.S3_ACCESS_KEY_ID?.trim() &&
      process.env.S3_SECRET_ACCESS_KEY?.trim() &&
      process.env.S3_PUBLIC_BASE_URL?.trim()
  );
}

function getClient(): S3Client {
  if (!client) {
    const endpoint = process.env.S3_ENDPOINT!.trim();
    const isR2 = /r2\.cloudflarestorage\.com/i.test(endpoint);
    const isYandex = /storage\.yandexcloud\.net/i.test(endpoint);
    let forcePathStyle = isR2 || isYandex;
    if (process.env.S3_FORCE_PATH_STYLE === '1' || process.env.S3_FORCE_PATH_STYLE === 'true') {
      forcePathStyle = true;
    }
    if (process.env.S3_FORCE_PATH_STYLE === '0' || process.env.S3_FORCE_PATH_STYLE === 'false') {
      forcePathStyle = false;
    }
    client = new S3Client({
      region: process.env.S3_REGION?.trim() || 'auto',
      endpoint,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle,
    });
  }
  return client;
}

function keyPrefix(): string {
  const p = process.env.S3_KEY_PREFIX?.trim();
  if (!p) return '';
  return p.replace(/^\/+|\/+$/g, '') + '/';
}

/**
 * Upload bytes and return the public URL stored in the database.
 */
export async function putPublicObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const bucket = process.env.S3_BUCKET!.trim();
  const base = process.env.S3_PUBLIC_BASE_URL!.replace(/\/$/, '');
  const fullKey = `${keyPrefix()}${key.replace(/^\/+/, '')}`;

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: fullKey,
      Body: body,
      ContentType: contentType || 'application/octet-stream',
    })
  );

  return `${base}/${fullKey}`;
}
