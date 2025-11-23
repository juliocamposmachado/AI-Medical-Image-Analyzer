export interface ContourData {
  area: number;
  perimeter: number;
  vertices: number;
  avgColor: number;
  centroidX: number;
  centroidY: number;
}

export interface AnalysisResult {
  contours: ContourData[];
  cellCount: number;
  darkerCells: number;
  largerCells: number;
  avgCellSize: number;
  avgColorDiff: number;
  anomalyLevel: string;
  diagnosis: string;
  processedImageData: string;
}

export async function analyzeImage(imageFile: File): Promise<AnalysisResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const grayscale = convertToGrayscale(imageData);
          const binary = otsuThreshold(grayscale);
          const contours = findContours(binary, canvas.width, canvas.height);

          drawContours(ctx, contours);
          const processedImageData = canvas.toDataURL('image/png');

          const thresholdDarkness = 100;
          const thresholdSize = 500;

          const darkerCells = contours.filter(c => c.avgColor < thresholdDarkness).length;
          const largerCells = contours.filter(c => c.area > thresholdSize).length;
          const avgCellSize = contours.reduce((sum, c) => sum + c.area, 0) / contours.length || 0;
          const avgColorDiff = contours.reduce((sum, c) => sum + c.avgColor, 0) / contours.length || 0;

          const thresholdDarknessLimit = 3;
          const thresholdSizeLimit = 5;

          let anomalyLevel = 'Baixo';
          let diagnosis = 'Normal';

          if (darkerCells > thresholdDarknessLimit || largerCells > thresholdSizeLimit) {
            anomalyLevel = 'Alto';
            diagnosis = 'Anomalia Detectada';
          }

          resolve({
            contours,
            cellCount: contours.length,
            darkerCells,
            largerCells,
            avgCellSize,
            avgColorDiff,
            anomalyLevel,
            diagnosis,
            processedImageData
          });
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(imageFile);
  });
}

function convertToGrayscale(imageData: ImageData): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(imageData.width * imageData.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    gray[i / 4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  return gray;
}

function otsuThreshold(gray: Uint8ClampedArray): Uint8ClampedArray {
  const histogram = new Array(256).fill(0);

  for (let i = 0; i < gray.length; i++) {
    histogram[gray[i]]++;
  }

  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let threshold = 0;
  const total = gray.length;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;

    wF = total - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];

    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    const variance = wB * wF * (mB - mF) * (mB - mF);

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  const binary = new Uint8ClampedArray(gray.length);
  for (let i = 0; i < gray.length; i++) {
    binary[i] = gray[i] > threshold ? 0 : 255;
  }

  return binary;
}

function findContours(binary: Uint8ClampedArray, width: number, height: number): ContourData[] {
  const visited = new Uint8Array(binary.length);
  const contours: ContourData[] = [];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;

      if (binary[idx] === 255 && !visited[idx]) {
        const contour = traceContour(binary, visited, x, y, width, height);

        if (contour.area > 50) {
          contours.push(contour);
        }
      }
    }
  }

  return contours;
}

function traceContour(
  binary: Uint8ClampedArray,
  visited: Uint8Array,
  startX: number,
  startY: number,
  width: number,
  height: number
): ContourData {
  const stack: [number, number][] = [[startX, startY]];
  const points: [number, number][] = [];
  let sumX = 0;
  let sumY = 0;
  let sumColor = 0;
  let count = 0;

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const idx = y * width + x;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (visited[idx] || binary[idx] !== 255) continue;

    visited[idx] = 1;
    points.push([x, y]);
    sumX += x;
    sumY += y;
    sumColor += binary[idx];
    count++;

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  const centroidX = sumX / count;
  const centroidY = sumY / count;
  const avgColor = sumColor / count;

  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    perimeter += Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  const vertices = approximatePolygon(points).length;

  return {
    area: count,
    perimeter,
    vertices,
    avgColor,
    centroidX,
    centroidY
  };
}

function approximatePolygon(points: [number, number][]): [number, number][] {
  if (points.length < 3) return points;

  const epsilon = 0.04 * calculatePerimeter(points);
  return douglasPeucker(points, epsilon);
}

function calculatePerimeter(points: [number, number][]): number {
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    perimeter += Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }
  return perimeter;
}

function douglasPeucker(points: [number, number][], epsilon: number): [number, number][] {
  if (points.length < 3) return points;

  let maxDistance = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const distance = perpendicularDistance(points[i], points[0], points[end]);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  if (maxDistance > epsilon) {
    const left = douglasPeucker(points.slice(0, index + 1), epsilon);
    const right = douglasPeucker(points.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [points[0], points[end]];
}

function perpendicularDistance(
  point: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number]
): number {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  const numerator = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1);
  const denominator = Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);

  return numerator / denominator;
}

function drawContours(ctx: CanvasRenderingContext2D, contours: ContourData[]): void {
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 2;

  contours.forEach(contour => {
    ctx.beginPath();
    ctx.arc(contour.centroidX, contour.centroidY, Math.sqrt(contour.area / Math.PI), 0, 2 * Math.PI);
    ctx.stroke();
  });
}

export function generateCellDescription(
  sizePercentage: number,
  vertices: number,
  colorDiff: number
): string {
  const descriptions: string[] = [];

  if (sizePercentage < 100) {
    descriptions.push('Atrofia celular');
  } else if (sizePercentage > 150) {
    descriptions.push('Hipertrofia');
  }

  if (vertices < 4) {
    descriptions.push('Forma irregular');
  } else if (vertices > 8) {
    descriptions.push('Metaplasia');
  }

  if (colorDiff > 120) {
    descriptions.push('Acúmulos intracelulares');
  } else if (colorDiff < 80) {
    descriptions.push('Hipocromia');
  }

  return descriptions.length > 0 ? descriptions.join(', ') : 'Normal';
}
