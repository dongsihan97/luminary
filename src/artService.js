import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export async function loadArtEntries() {
  const { data, error } = await supabase
    .from("art_entries")
    .select("*")
    .order("encountered_at", { ascending: false });
  if (error) return [];
  return data;
}

export async function deleteArtEntry(id) {
  const { error } = await supabase.from("art_entries").delete().eq("id", id);
  if (error) throw error;
}

export async function updateArtEntry(id, updates) {
  const { data, error } = await supabase
    .from("art_entries")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function insertArtEntry(entry) {
  const { data, error } = await supabase
    .from("art_entries")
    .insert(entry)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function convertIfHeic(file) {
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif");
  if (!isHeic) return file;
  const heic2any = (await import("heic2any")).default;
  const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const converted = Array.isArray(blob) ? blob[0] : blob;
  return new File([converted], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
}

export async function generateThumbnail(file, maxWidth = 1200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        resolve(blob);
      }, "image/jpeg", 0.92);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export async function uploadArtPhoto(blob, entryId, type) {
  const path = `${entryId}_${type}.jpg`;
  const { error } = await supabase.storage
    .from("art-photos")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("art-photos").getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
