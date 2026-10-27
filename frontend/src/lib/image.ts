/** Shrink a chosen image to a JPEG of at most `maxSize` pixels, so uploads stay small and fast. */
export function compressImage(file: File, maxSize = 1400): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file is not a valid image."));
    };
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not prepare the image."))),
        "image/jpeg",
        0.8
      );
    };
    img.src = url;
  });
}
