import * as LZString from 'lz-string';
import type { ReportDraft } from '@/types/offline';

export async function compressDraft(draft: ReportDraft): Promise<ReportDraft> {
  const compressedDraft = { ...draft };
  
  compressedDraft.photos = await Promise.all(
    draft.photos.map(async (photo) => {
      if (photo.base64Data && !photo.compressedSize) {
        try {
          const compressed = LZString.compressToUTF16(photo.base64Data);
          if (compressed && compressed.length < photo.base64Data.length) {
            return {
              ...photo,
              base64Data: compressed,
              compressedSize: compressed.length * 2, // UTF-16 is 2 bytes per char
            };
          }
        } catch (error) {
          console.warn('Compression failed, using original data:', error);
        }
      }
      return photo;
    })
  );

  return compressedDraft;
}

export function decompressDraft(draft: ReportDraft): ReportDraft {
  const decompressedDraft = { ...draft };
  
  decompressedDraft.photos = draft.photos.map((photo) => {
    if (photo.compressedSize) {
      try {
        const decompressed = LZString.decompressFromUTF16(photo.base64Data);
        return {
          ...photo,
          base64Data: decompressed || photo.base64Data,
        };
      } catch (error) {
        console.warn('Decompression failed, using original data:', error);
        return photo;
      }
    }
    return photo;
  });

  return decompressedDraft;
}