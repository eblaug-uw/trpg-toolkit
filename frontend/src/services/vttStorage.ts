import { supabase } from "./supabaseClient";

type SignedUrlCacheItem = {
  url: string;
  expiresAt: number;
};

type SignedThumbnail = {
  name: string;
  url: string;
};

const signedUrlCache = new Map<string, SignedUrlCacheItem>();
const signedThumbnailUrlCache = new Map<string, SignedUrlCacheItem>();
const signedUrlRequests = new Map<string, Promise<string>>();

function getCachedUrl(cache: Map<string, SignedUrlCacheItem>, key: string): string | undefined {
  const item = cache.get(key);
  if (!item || item.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return item.url;
}

function setCachedUrl(
  cache: Map<string, SignedUrlCacheItem>,
  key: string,
  url: string,
  expiresInSeconds: number,
) {
  cache.set(key, {
    url,
    expiresAt: Date.now() + Math.max(0, expiresInSeconds - 60) * 1000,
  });
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Not signed in");
  }

  return data.user.id;
}

export async function uploadImage(bucket: "maps" | "tokens", file: File): Promise<string> {
  const userId = await requireUserId();
  const safeName = `${Date.now()}-${file.name}`;
  const path = `${userId}/${safeName}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    throw new Error(`upload failed: ${error.message}`);
  }
  return path;
}

export async function listImages(bucket: "maps" | "tokens"): Promise<string[]> {
  const userId = await requireUserId();

  const { data, error } = await supabase.storage.from(bucket).list(userId, {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });

  if (error) {
    throw new Error(`List failed: ${error.message}`);
  }

  return data.map((file) => file.name);
}

export async function getSignedUrl(
  bucket: "maps" | "tokens",
  name: string,
  expiresInSeconds: number = 3600,
): Promise<string> {
  const userId = await requireUserId();
  const path = `${userId}/${name}`;
  const cacheKey = `${bucket}/${path}`;
  const cachedUrl = getCachedUrl(signedUrlCache, cacheKey);
  if (cachedUrl) return cachedUrl;

  const existingRequest = signedUrlRequests.get(cacheKey);
  if (existingRequest !== undefined) return existingRequest;

  const request = supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds)
    .then(({ data, error }) => {
      if (error || !data) {
        throw new Error(`Could not sign URL: ${error?.message ?? "unknown error"}`);
      }

      setCachedUrl(signedUrlCache, cacheKey, data.signedUrl, expiresInSeconds);
      return data.signedUrl;
    })
    .finally(() => {
      signedUrlRequests.delete(cacheKey);
    });

  signedUrlRequests.set(cacheKey, request);
  return request;
}

export async function getSignedThumbnailUrls(
  bucket: "maps" | "tokens",
  names: string[],
  expiresInSeconds: number = 3600,
  onThumbnail?: (thumbnail: SignedThumbnail) => void,
): Promise<SignedThumbnail[]> {
  const userId = await requireUserId();

  return Promise.all(
    names.map(async (name) => {
      const path = `${userId}/${name}`;
      const cacheKey = `${bucket}/${path}`;
      const cachedUrl = getCachedUrl(signedThumbnailUrlCache, cacheKey);
      if (cachedUrl) {
        const thumbnail = { name, url: cachedUrl };
        onThumbnail?.(thumbnail);
        return thumbnail;
      }

      const storage = supabase.storage.from(bucket);
      const { data, error } = await storage.createSignedUrl(path, expiresInSeconds, {
        transform: { width: 240, height: 160, resize: "cover", quality: 60 },
      });

      if (data) {
        const thumbnail = { name, url: data.signedUrl };
        setCachedUrl(signedThumbnailUrlCache, cacheKey, thumbnail.url, expiresInSeconds);
        onThumbnail?.(thumbnail);
        return thumbnail;
      }

      const { data: fallbackData, error: fallbackError } = await storage.createSignedUrl(
        path,
        expiresInSeconds,
      );
      if (!fallbackData) {
        throw new Error(
          `Could not sign thumbnail URL: ${fallbackError?.message ?? error?.message ?? "unknown error"}`,
        );
      }

      const thumbnail = { name, url: fallbackData.signedUrl };
      setCachedUrl(signedThumbnailUrlCache, cacheKey, thumbnail.url, expiresInSeconds);
      onThumbnail?.(thumbnail);
      return thumbnail;
    }),
  );
}
