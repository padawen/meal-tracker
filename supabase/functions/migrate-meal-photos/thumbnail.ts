export function thumbnailPixels(image: { width: number; height: number; data: Uint8Array }) {
  const ratio = Math.min(384 / image.width, 384 / image.height, 1)
  const width = Math.max(1, Math.round(image.width * ratio))
  const height = Math.max(1, Math.round(image.height * ratio))
  const data = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    const y0 = Math.floor(y * image.height / height)
    const y1 = Math.min(image.height, Math.ceil((y + 1) * image.height / height))
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor(x * image.width / width)
      const x1 = Math.min(image.width, Math.ceil((x + 1) * image.width / width))
      const total = (x1 - x0) * (y1 - y0)
      for (let channel = 0; channel < 4; channel++) {
        let sum = 0
        for (let sy = y0; sy < y1; sy++) for (let sx = x0; sx < x1; sx++) {
          sum += image.data[(sy * image.width + sx) * 4 + channel]
        }
        data[(y * width + x) * 4 + channel] = Math.round(sum / total)
      }
    }
  }
  return { width, height, data }
}
