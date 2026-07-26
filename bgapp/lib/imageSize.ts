/**
 * Reads pixel dimensions from the first bytes of a remote image.
 *
 * Only the header is needed, so a Range request keeps this cheap even across a
 * whole year of covers; the response is cached for a day. Anything unreadable
 * falls back to a square, which just means a slightly less balanced column.
 */

const FALLBACK_RATIO = 1;

function pngSize(b: Uint8Array): { w: number; h: number } | null {
  // 8-byte signature, then IHDR: length(4) type(4) width(4) height(4)
  if (b.length < 24) return null;
  if (b[0] !== 0x89 || b[1] !== 0x50 || b[2] !== 0x4e || b[3] !== 0x47) return null;
  const dv = new DataView(b.buffer, b.byteOffset);
  return { w: dv.getUint32(16), h: dv.getUint32(20) };
}

function jpegSize(b: Uint8Array): { w: number; h: number } | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  const dv = new DataView(b.buffer, b.byteOffset);
  let i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xff) { i++; continue; }
    const marker = b[i + 1];
    // SOF0..SOF15, excluding the non-frame markers DHT/JPG/DAC
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { h: dv.getUint16(i + 5), w: dv.getUint16(i + 7) };
    }
    i += 2 + dv.getUint16(i + 2);   // skip this segment
  }
  return null;
}

/** width / height, or 1 when it can't be determined. */
export async function imageRatio(url: string): Promise<number> {
  try {
    const res = await fetch(url, {
      headers: { Range: "bytes=0-2047" },
      next: { revalidate: 86400 },
    });
    if (!res.ok && res.status !== 206) return FALLBACK_RATIO;

    const bytes = new Uint8Array(await res.arrayBuffer());
    const size = pngSize(bytes) ?? jpegSize(bytes);
    if (!size || !size.w || !size.h) return FALLBACK_RATIO;

    return size.w / size.h;
  } catch {
    return FALLBACK_RATIO;
  }
}
