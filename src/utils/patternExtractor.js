/**
 * 图案提取工具
 * 支持自动和手动提取印花图案
 */
export class PatternExtractor {
  constructor() {
    this.selectionMode = 'auto';
    this.selectedRegion = null;
  }

  getImageDimensions(image) {
    return {
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    };
  }

  async extractPatternAuto(image, options = {}) {
    const {
      minPatternSize = 50,
      backgroundThreshold = 38,
      minOpaqueRatio = 0.015,
    } = options;

    return new Promise((resolve) => {
      const { width, height } = this.getImageDimensions(image);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pattern = this.detectPatternRegion(
        imageData,
        minPatternSize,
        backgroundThreshold,
        minOpaqueRatio
      );

      if (pattern) {
        const extractedCanvas = this.cropPattern(canvas, pattern.region, pattern.mask);
        const extractedImage = new Image();
        extractedImage.onload = () => resolve(extractedImage);
        extractedImage.src = extractedCanvas.toDataURL();
      } else {
        const centerPattern = {
          x: canvas.width * 0.2,
          y: canvas.height * 0.2,
          width: canvas.width * 0.6,
          height: canvas.height * 0.6,
        };
        const extractedCanvas = this.cropPattern(canvas, centerPattern);
        const extractedImage = new Image();
        extractedImage.onload = () => resolve(extractedImage);
        extractedImage.src = extractedCanvas.toDataURL();
      }
    });
  }

  extractPatternManual(image, region) {
    return new Promise((resolve) => {
      const { width, height } = this.getImageDimensions(image);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);

      const extractedCanvas = this.cropPattern(canvas, region);
      const extractedImage = new Image();
      extractedImage.onload = () => resolve(extractedImage);
      extractedImage.src = extractedCanvas.toDataURL();
    });
  }

  detectPatternRegion(imageData, minSize, backgroundThreshold, minOpaqueRatio) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const dominantColor = this.getDominantColor(data, width, height);
    const mask = new Uint8Array(width * height);

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let activePixels = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const alpha = data[i + 3];

        if (alpha < 16) {
          continue;
        }

        const distance = this.getColorDistance(
          data[i],
          data[i + 1],
          data[i + 2],
          dominantColor.r,
          dominantColor.g,
          dominantColor.b
        );

        const saturation = this.getSaturation(data[i], data[i + 1], data[i + 2]);
        const brightnessDelta = Math.abs(
          this.getBrightness(data[i], data[i + 1], data[i + 2]) - dominantColor.brightness
        );

        if (distance > backgroundThreshold || saturation > 0.22 || brightnessDelta > 26) {
          const index = y * width + x;
          mask[index] = 1;
          activePixels += 1;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (activePixels / (width * height) < minOpaqueRatio || maxX < minX || maxY < minY) {
      return null;
    }

    const padding = Math.max(12, Math.floor(Math.min(width, height) * 0.03));
    const region = {
      x: Math.max(0, minX - padding),
      y: Math.max(0, minY - padding),
      width: Math.max(minPatternSize, Math.min(width, maxX - minX + padding * 2 + 1)),
      height: Math.max(minPatternSize, Math.min(height, maxY - minY + padding * 2 + 1)),
    };

    region.width = Math.min(region.width, width - region.x);
    region.height = Math.min(region.height, height - region.y);

    return { region, mask };
  }

  getDominantColor(data, width, height) {
    let rTotal = 0;
    let gTotal = 0;
    let bTotal = 0;
    let count = 0;

    const startX = Math.floor(width * 0.2);
    const endX = Math.ceil(width * 0.8);
    const startY = Math.floor(height * 0.2);
    const endY = Math.ceil(height * 0.85);

    for (let y = startY; y < endY; y += 2) {
      for (let x = startX; x < endX; x += 2) {
        const i = (y * width + x) * 4;
        if (data[i + 3] < 16) {
          continue;
        }
        rTotal += data[i];
        gTotal += data[i + 1];
        bTotal += data[i + 2];
        count += 1;
      }
    }

    if (count === 0) {
      return { r: 255, g: 255, b: 255, brightness: 255 };
    }

    const r = rTotal / count;
    const g = gTotal / count;
    const b = bTotal / count;

    return {
      r,
      g,
      b,
      brightness: this.getBrightness(r, g, b),
    };
  }

  getBrightness(r, g, b) {
    return (r + g + b) / 3;
  }

  getSaturation(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === 0) {
      return 0;
    }
    return (max - min) / max;
  }

  getColorDistance(r1, g1, b1, r2, g2, b2) {
    return Math.sqrt(
      (r1 - r2) * (r1 - r2) +
      (g1 - g2) * (g1 - g2) +
      (b1 - b2) * (b1 - b2)
    );
  }

  cropPattern(sourceCanvas, region, sourceMask = null) {
    const canvas = document.createElement('canvas');
    canvas.width = region.width;
    canvas.height = region.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      sourceCanvas,
      region.x,
      region.y,
      region.width,
      region.height,
      0,
      0,
      region.width,
      region.height
    );

    if (sourceMask) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const sourceWidth = sourceCanvas.width;

      for (let y = 0; y < region.height; y++) {
        for (let x = 0; x < region.width; x++) {
          const sourceX = region.x + x;
          const sourceY = region.y + y;
          const sourceIndex = sourceY * sourceWidth + sourceX;
          const targetIndex = (y * region.width + x) * 4;

          if (!sourceMask[sourceIndex]) {
            data[targetIndex + 3] = 0;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
    }

    return canvas;
  }
}
