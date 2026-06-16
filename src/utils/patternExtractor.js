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
      colorThreshold = 30,
      edgeThreshold = 100,
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
        colorThreshold,
        edgeThreshold
      );

      if (pattern) {
        const extractedCanvas = this.cropPattern(canvas, pattern);
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

  detectPatternRegion(imageData, minSize, colorThreshold, edgeThreshold) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    const blockSize = 20;
    const blocks = [];
    const blockRows = Math.floor(height / blockSize);
    const blockCols = Math.floor(width / blockSize);

    for (let by = 0; by < blockRows; by++) {
      for (let bx = 0; bx < blockCols; bx++) {
        const variance = this.calculateBlockVariance(
          data,
          width,
          bx * blockSize,
          by * blockSize,
          blockSize
        );
        blocks.push({
          x: bx * blockSize,
          y: by * blockSize,
          variance,
        });
      }
    }

    blocks.sort((a, b) => b.variance - a.variance);
    const topBlock = blocks[0];

    if (topBlock && topBlock.variance > colorThreshold) {
      const expandSize = blockSize * 2;
      return {
        x: Math.max(0, topBlock.x - expandSize),
        y: Math.max(0, topBlock.y - expandSize),
        width: Math.min(width - topBlock.x + expandSize, expandSize * 3),
        height: Math.min(height - topBlock.y + expandSize, expandSize * 3),
      };
    }

    return null;
  }

  calculateBlockVariance(data, width, startX, startY, size) {
    const colors = [];
    const endX = Math.min(startX + size, width);
    const endY = Math.min(startY + size, Math.floor(data.length / (width * 4)));

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;
        colors.push(brightness);
      }
    }

    if (colors.length === 0) return 0;

    const mean = colors.reduce((a, b) => a + b, 0) / colors.length;
    const variance =
      colors.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      colors.length;

    return variance;
  }

  cropPattern(sourceCanvas, region) {
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

    return canvas;
  }
}
