/**
 * 四方连续图案生成工具
 * 实现无缝平铺效果
 */
export class SeamlessPatternGenerator {
  generateSeamlessPattern(patternImage, options = {}) {
    const {
      tileSize = 256,
      tilesX = 4,
      tilesY = 4,
      blendEdges = true,
    } = options;

    const canvas = document.createElement('canvas');
    canvas.width = tileSize * tilesX;
    canvas.height = tileSize * tilesY;
    const ctx = canvas.getContext('2d');

    const processedPattern = this.processPatternForSeamless(
      patternImage,
      tileSize,
      blendEdges
    );

    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        ctx.drawImage(
          processedPattern,
          x * tileSize,
          y * tileSize,
          tileSize,
          tileSize
        );
      }
    }

    return canvas;
  }

  processPatternForSeamless(image, size, blendEdges) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const prepared = this.preparePatternSource(image);
    this.drawPatternToTile(ctx, prepared, size);

    if (blendEdges) {
      this.makeSeamless(canvas, size);
    }

    return canvas;
  }

  preparePatternSource(image) {
    const sourceCanvas = document.createElement('canvas');
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    const sourceCtx = sourceCanvas.getContext('2d');
    sourceCtx.drawImage(image, 0, 0);

    const trimmed = this.trimTransparentBounds(sourceCanvas);
    return this.removeUniformBackground(trimmed);
  }

  trimTransparentBounds(canvas) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (data[i + 3] > 16) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      return canvas;
    }

    const padding = Math.max(4, Math.floor(Math.min(width, height) * 0.04));
    const cropX = Math.max(0, minX - padding);
    const cropY = Math.max(0, minY - padding);
    const cropWidth = Math.min(width - cropX, maxX - minX + padding * 2 + 1);
    const cropHeight = Math.min(height - cropY, maxY - minY + padding * 2 + 1);

    const trimmed = document.createElement('canvas');
    trimmed.width = cropWidth;
    trimmed.height = cropHeight;
    const trimmedCtx = trimmed.getContext('2d');
    trimmedCtx.drawImage(
      canvas,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    return trimmed;
  }

  removeUniformBackground(canvas) {
    const result = document.createElement('canvas');
    result.width = canvas.width;
    result.height = canvas.height;
    const ctx = result.getContext('2d');
    ctx.drawImage(canvas, 0, 0);

    const imageData = ctx.getImageData(0, 0, result.width, result.height);
    const data = imageData.data;
    const dominant = this.sampleDominantColor(data, result.width, result.height);

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 16) {
        continue;
      }

      const distance = this.colorDistance(
        data[i],
        data[i + 1],
        data[i + 2],
        dominant.r,
        dominant.g,
        dominant.b
      );

      const saturation = this.saturation(data[i], data[i + 1], data[i + 2]);

      if (distance < 34 && saturation < 0.18) {
        data[i + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return this.trimTransparentBounds(result);
  }

  sampleDominantColor(data, width, height) {
    let rTotal = 0;
    let gTotal = 0;
    let bTotal = 0;
    let count = 0;

    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const edgePixel =
          x < width * 0.15 ||
          x > width * 0.85 ||
          y < height * 0.15 ||
          y > height * 0.85;

        if (!edgePixel) {
          continue;
        }

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
      return { r: 255, g: 255, b: 255 };
    }

    return {
      r: rTotal / count,
      g: gTotal / count,
      b: bTotal / count,
    };
  }

  drawPatternToTile(ctx, image, size) {
    const sourceWidth = image.width;
    const sourceHeight = image.height;
    const sourceRatio = sourceWidth / sourceHeight;
    let targetWidth = size * 0.84;
    let targetHeight = targetWidth / sourceRatio;

    if (targetHeight > size * 0.84) {
      targetHeight = size * 0.84;
      targetWidth = targetHeight * sourceRatio;
    }

    const offsetX = (size - targetWidth) / 2;
    const offsetY = (size - targetHeight) / 2;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(image, offsetX, offsetY, targetWidth, targetHeight);
  }

  makeSeamless(canvas, size) {
    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = size;
    baseCanvas.height = size;
    const baseCtx = baseCanvas.getContext('2d');
    baseCtx.drawImage(canvas, 0, 0);

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(baseCanvas, -size / 2, -size / 2);
    ctx.drawImage(baseCanvas, size / 2, -size / 2);
    ctx.drawImage(baseCanvas, -size / 2, size / 2);
    ctx.drawImage(baseCanvas, size / 2, size / 2);

    this.blendEdges(canvas, size);
  }

  blendEdges(canvas, size) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    const blendWidth = Math.max(8, Math.floor(size * 0.12));

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < blendWidth; x++) {
        const leftIndex = (y * size + x) * 4;
        const rightIndex = (y * size + (size - blendWidth + x)) * 4;

        const blendFactor = x / blendWidth;

        for (let c = 0; c < 3; c++) {
          const leftValue = data[leftIndex + c];
          const rightValue = data[rightIndex + c];
          const blended = leftValue * (1 - blendFactor) + rightValue * blendFactor;
          data[leftIndex + c] = blended;
          data[rightIndex + c] = blended;
        }
      }
    }

    for (let x = 0; x < size; x++) {
      for (let y = 0; y < blendWidth; y++) {
        const topIndex = (y * size + x) * 4;
        const bottomIndex = ((size - blendWidth + y) * size + x) * 4;

        const blendFactor = y / blendWidth;

        for (let c = 0; c < 3; c++) {
          const topValue = data[topIndex + c];
          const bottomValue = data[bottomIndex + c];
          const blended = topValue * (1 - blendFactor) + bottomValue * blendFactor;
          data[topIndex + c] = blended;
          data[bottomIndex + c] = blended;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  saturation(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === 0) {
      return 0;
    }
    return (max - min) / max;
  }

  colorDistance(r1, g1, b1, r2, g2, b2) {
    return Math.sqrt(
      (r1 - r2) * (r1 - r2) +
      (g1 - g2) * (g1 - g2) +
      (b1 - b2) * (b1 - b2)
    );
  }

  generatePreview(patternImage, previewSize = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = previewSize;
    canvas.height = previewSize;
    const ctx = canvas.getContext('2d');

    const processedPattern = this.processPatternForSeamless(
      patternImage,
      previewSize / 2,
      true
    );

    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        ctx.drawImage(
          processedPattern,
          x * (previewSize / 2),
          y * (previewSize / 2),
          previewSize / 2,
          previewSize / 2
        );
      }
    }

    return canvas;
  }
}
