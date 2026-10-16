// Kompresi gambar di browser sebelum upload (hemat kuota storage & bandwidth bersama).
const MAX_SIDE = 1600;
const AVATAR_SIDE = 256;
const QUALITY = 0.8;

const toBlob = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));

/** Gambar sumber (sx, sy, sw, sh) → kanvas w×h berlatar putih → WebP (fallback JPEG). */
async function encode(file: File, name: string, crop: (w: number, h: number) => { sx: number; sy: number; sw: number; sh: number; w: number; h: number }) {
  const bitmap = await createImageBitmap(file);
  const { sx, sy, sw, sh, w, h } = crop(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia");
  ctx.fillStyle = "#fff"; // latar putih untuk gambar transparan (JPEG tidak punya alpha)
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);
  bitmap.close();

  // Safari lama mengembalikan PNG untuk "image/webp" → pakai JPEG.
  let blob = await toBlob(canvas, "image/webp");
  if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg");
  if (!blob) throw new Error("Gagal mengompres gambar");
  return new File([blob], `${name}.${blob.type === "image/webp" ? "webp" : "jpg"}`, { type: blob.type });
}

/** Perkecil ke sisi terpanjang 1600px, simpan sebagai WebP (fallback JPEG jika browser tidak mendukung WebP). */
export function compressImage(file: File): Promise<File> {
  return encode(file, "wip", (width, height) => {
    const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
    return { sx: 0, sy: 0, sw: width, sh: height, w: Math.round(width * scale), h: Math.round(height * scale) };
  });
}

/** Foto profil: potong persegi dari tengah, 256×256. */
export function compressAvatar(file: File): Promise<File> {
  return encode(file, "avatar", (width, height) => {
    const side = Math.min(width, height);
    const out = Math.min(AVATAR_SIDE, side);
    return { sx: (width - side) / 2, sy: (height - side) / 2, sw: side, sh: side, w: out, h: out };
  });
}
