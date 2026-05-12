import { supabase } from "./supabaseClient";

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

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) {
    throw new Error(`Could not sign URL: ${error?.message ?? "unknown error"}`);
  }

  return data.signedUrl;
}
