/**
 * 图像分割工具
 * 使用基于颜色和边缘检测的算法进行图像分割
 * 注意：当前使用简化算法，未来可以集成 TensorFlow.js 预训练模型（如 DeepLab、U-Net）
 */
export class ImageSegmentation {
  constructor() {
    this.model = null;
    this.isModelLoaded = false;
  }

  getImageDimensions(image) {
    return {
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    };
  }

  createImageFromCanvas(canvas) {
    return new Promise((resolve) => {
      const outputImage = new Image();
      outputImage.onload = () => resolve(outputImage);
      outputImage.src = canvas.toDataURL();
    });
  }

  async loadModel() {
    this.isModelLoaded = true;
    return true;
  }

  async segmentImage(image) {
    if (!this.isModelLoaded) {
      await this.loadModel();
    }

    return new Promise(async (resolve) => {
      const { width, height } = this.getImageDimensions(image);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const segmentedData = this.performSegmentation(imageData);

      const segmentedCanvas = document.createElement('canvas');
      segmentedCanvas.width = canvas.width;
      segmentedCanvas.height = canvas.height;
      const segmentedCtx = segmentedCanvas.getContext('2d');
      segmentedCtx.putImageData(segmentedData, 0, 0);

      const opaqueRatio = this.calculateOpaqueRatio(segmentedData.data);

      if (opaqueRatio < 0.03) {
        resolve(await this.createImageFromCanvas(canvas));
        return;
      }

      resolve(await this.createImageFromCanvas(segmentedCanvas));
    });
  }

  calculateOpaqueRatio(data) {
    let opaquePixels = 0;

    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) {
        opaquePixels += 1;
      }
    }

    return opaquePixels / (data.length / 4);
  }

  performSegmentation(imageData) {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    const mask = this.createMask(data, width, height);

    for (let i = 0; i < data.length; i += 4) {
      const pixelIndex = i / 4;
      if (!mask[pixelIndex]) {
        data[i + 3] = 0;
      }
    }

    return new ImageData(data, width, height);
  }

  createMask(data, width, height) {
    const mask = new Array(width * height).fill(false);
    const centerX = width / 2;
    const centerY = height / 2;

    const edges = this.detectEdges(data, width, height);

    const visited = new Set();
    const queue = [[Math.floor(centerX), Math.floor(centerY)]];

    while (queue.length > 0) {
      const [x, y] = queue.shift();
      const index = y * width + x;

      if (visited.has(index) || x < 0 || x >= width || y < 0 || y >= height) {
        continue;
      }

      visited.add(index);

      if (edges[index] < 50) {
        mask[index] = true;

        const neighbors = [
          [x + 1, y],
          [x - 1, y],
          [x, y + 1],
          [x, y - 1],
        ];

        for (const [nx, ny] of neighbors) {
          const nIndex = ny * width + nx;
          if (!visited.has(nIndex) && nx >= 0 && nx < width && ny >= 0 && ny < height) {
            queue.push([nx, ny]);
          }
        }
      }
    }

    return mask;
  }

  detectEdges(data, width, height) {
    const edges = new Array(width * height).fill(0);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const index = y * width + x;
        const gx = this.getGradientX(data, x, y, width, height);
        const gy = this.getGradientY(data, x, y, width, height);
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edges[index] = magnitude;
      }
    }

    return edges;
  }

  getGradientX(data, x, y, width, height) {
    const getGray = (x, y) => {
      const i = (y * width + x) * 4;
      return (data[i] + data[i + 1] + data[i + 2]) / 3;
    };

    return (
      -1 * getGray(x - 1, y - 1) +
      1 * getGray(x + 1, y - 1) +
      -2 * getGray(x - 1, y) +
      2 * getGray(x + 1, y) +
      -1 * getGray(x - 1, y + 1) +
      1 * getGray(x + 1, y + 1)
    );
  }

  getGradientY(data, x, y, width, height) {
    const getGray = (x, y) => {
      const i = (y * width + x) * 4;
      return (data[i] + data[i + 1] + data[i + 2]) / 3;
    };

    return (
      -1 * getGray(x - 1, y - 1) +
      -2 * getGray(x, y - 1) +
      -1 * getGray(x + 1, y - 1) +
      1 * getGray(x - 1, y + 1) +
      2 * getGray(x, y + 1) +
      1 * getGray(x + 1, y + 1)
    );
  }
}
