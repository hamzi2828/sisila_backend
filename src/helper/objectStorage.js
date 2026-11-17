// src/helper/objectStorage.js
// Where uploaded files are kept: an S3-compatible bucket (SeaweedFS on the
// Coolify server), set by S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID,
// S3_SECRET_ACCESS_KEY and S3_PUBLIC_URL (the bucket's public address, e.g.
// https://media.thejymor.com/media). put() and del() keep the shape the
// @vercel/blob calls in blobUpload.js had, so the rest of the code is unchanged.
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

let client;
function s3() {
  if (!client) {
    client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

const publicBase = () => String(process.env.S3_PUBLIC_URL || '').replace(/\/+$/, '');

function isConfigured() {
  return !!process.env.S3_BUCKET;
}

// Files moved from Vercel Blob keep their old addresses in older records, so
// those still count as ours when something asks whether a URL is a stored file.
function isStorageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const base = publicBase();
  return (!!base && url.startsWith(`${base}/`)) || url.includes('blob.vercel-storage.com');
}

function keyFromUrl(url) {
  const base = publicBase();
  if (!base || !url.startsWith(`${base}/`)) return null;
  return decodeURIComponent(url.slice(base.length + 1).split('?')[0]);
}

async function put(pathname, body, options = {}) {
  const Key = String(pathname).replace(/^\/+/, '');
  await s3().send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key,
    Body: body,
    ContentType: options.contentType,
    CacheControl: 'public, max-age=31536000',
  }));
  const url = `${publicBase()}/${Key.split('/').map(encodeURIComponent).join('/')}`;
  return { url, pathname: Key };
}

async function del(urls) {
  for (const url of [].concat(urls || [])) {
    const Key = keyFromUrl(String(url));
    if (!Key) continue;
    await s3().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key }));
  }
}

module.exports = { put, del, isConfigured, isStorageUrl };
