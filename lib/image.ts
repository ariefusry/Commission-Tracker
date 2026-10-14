// Kompresi gambar di browser sebelum upload (hemat kuota storage & bandwidth bersama).
const MAX_SIDE = 1600;
const QUALITY = 0.8;

const toBlob = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));

/** Perkecil ke sisi terpanjang 1600px, simpan sebagai WebP (fallback JPEG jika browser tidak mendukung WebP). */
export async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia");
  ctx.fillStyle = "#fff"; // latar putih untuk gambar transparan (JPEG tidak punya alpha)
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // Safari lama mengembalikan PNG untuk "image/webp" → pakai JPEG.
  let blob = await toBlob(canvas, "image/webp");
  if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg");
  if (!blob) throw new Error("Gagal mengompres gambar");
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `wip.${ext}`, { type: blob.type });
}
