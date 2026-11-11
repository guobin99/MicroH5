/**
 * pico 人脸检测运行时。
 *
 * 移植自 pico / pico.js（https://github.com/tehnokv/picojs，MIT License）：
 * 约 200 行的纯 JavaScript 级联分类器，不依赖 WASM、不依赖外部模型请求，
 * 可直接运行在微信内置浏览器（iOS WKWebView / Android XWeb）中。
 *
 * 用途：人脸采集时在本地判断照片中是否存在人脸。
 * 注意：本模块只回答「照片里有没有人脸」，不做 1:N 身份比对。
 */
import CASCADE_BASE64 from './cascade.js';

/** 人脸检测的运行参数（前端三端与后台保持一致）。 */
export const FACE_DETECT = {
  /** 检测前把图片等比缩放，使长边不超过该值，兼顾精度与耗时 */
  maxSide: 480,
  /** 最小人脸边长（检测图坐标系），小于该边长的检出结果视为噪声 */
  minSize: 30,
  /** 级联打分阈值：高于该分数才认为检出了人脸 */
  scoreThreshold: 5.0,
  /** 检测窗口每次移动的比例 */
  shiftFactor: 0.1,
  /** 多尺度检测的缩放比例 */
  scaleFactor: 1.1,
  /** 聚类时的 IoU 阈值（非极大值抑制） */
  iouThreshold: 0.2,
};

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** 纯 JS Base64 解码，避免依赖 atob / wx.base64ToArrayBuffer 等平台 API。 */
export function base64ToBytes(input) {
  const clean = String(input).replace(/[^A-Za-z0-9+/=]/g, '');
  const len = clean.length;
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const out = new Uint8Array((len / 4) * 3 - padding);
  const lookup = new Int16Array(256).fill(-1);
  for (let i = 0; i < B64.length; i++) lookup[B64.charCodeAt(i)] = i;
  let o = 0;
  for (let i = 0; i < len; i += 4) {
    const a = lookup[clean.charCodeAt(i)];
    const b = lookup[clean.charCodeAt(i + 1)];
    const c = lookup[clean.charCodeAt(i + 2)];
    const d = lookup[clean.charCodeAt(i + 3)];
    out[o++] = (a << 2) | (b >> 4);
    if (o < out.length) out[o++] = ((b & 15) << 4) | (c >> 2);
    if (o < out.length) out[o++] = ((c & 3) << 6) | (d & 63);
  }
  return out;
}

let cascadeCache = null;

/** 返回解析后的级联数据（解析结果全局缓存一次）。 */
export function getCascade() {
  if (!cascadeCache) cascadeCache = unpackCascade(base64ToBytes(CASCADE_BASE64));
  return cascadeCache;
}

/**
 * 解析级联二进制，返回 classify_region(r, c, s, pixels, ldim) 分类函数。
 * 与 pico.js 的 unpack_cascade 保持完全一致的字节布局与索引语义。
 */
export function unpackCascade(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = 8; // 跳过 8 字节头（版本号 + 训练期数据）
  const tdepth = view.getInt32(p, true);
  p += 4;
  const ntrees = view.getInt32(p, true);
  p += 4;
  const pow2tdepth = 1 << tdepth;

  // 每棵树：4 字节占位 + (4 * 2^tdepth - 4) 字节测试码，均为 int8
  const tcodes = new Int8Array(ntrees * 4 * pow2tdepth);
  const tpreds = new Float32Array(ntrees * pow2tdepth);
  const thresh = new Float32Array(ntrees);
  for (let t = 0; t < ntrees; t++) {
    const base = t * 4 * pow2tdepth;
    for (let k = 0; k < 4 * pow2tdepth - 4; k++) tcodes[base + 4 + k] = bytes[p + k];
    p += 4 * pow2tdepth - 4;
    for (let k = 0; k < pow2tdepth; k++) {
      tpreds[t * pow2tdepth + k] = view.getFloat32(p, true);
      p += 4;
    }
    thresh[t] = view.getFloat32(p, true);
    p += 4;
  }

  return function classifyRegion(r, c, s, pixels, ldim) {
    r = 256 * r;
    c = 256 * c;
    let root = 0;
    let o = 0;
    for (let i = 0; i < ntrees; i++) {
      let idx = 1;
      for (let j = 0; j < tdepth; j++) {
        // 注意：右侧先求值，tcodes 使用本次更新前的 idx（与 pico.js 语义一致）
        idx = 2 * idx + (pixels[((r + tcodes[root + 4 * idx + 0] * s) >> 8) * ldim + ((c + tcodes[root + 4 * idx + 1] * s) >> 8)] <=
          pixels[((r + tcodes[root + 4 * idx + 2] * s) >> 8) * ldim + ((c + tcodes[root + 4 * idx + 3] * s) >> 8)]
          ? 1
          : 0);
      }
      o += tpreds[pow2tdepth * i + idx - pow2tdepth];
      if (o <= thresh[i]) return -1;
      root += 4 * pow2tdepth;
    }
    return o - thresh[ntrees - 1];
  };
}

/** 多尺度滑窗扫描，返回 [r, c, s, q] 四元组数组。 */
export function runCascade(image, classifyRegion, params) {
  const { pixels, nrows, ncols, ldim } = image;
  const { shiftFactor, minSize, maxSize, scaleFactor } = params;
  let scale = minSize;
  const detections = [];
  while (scale <= maxSize) {
    const step = Math.max((shiftFactor * scale) | 0, 1);
    const offset = ((scale / 2) | 0) + 1;
    for (let r = offset; r <= nrows - offset; r += step) {
      for (let c = offset; c <= ncols - offset; c += step) {
        const q = classifyRegion(r, c, scale, pixels, ldim);
        if (q > 0.0) detections.push([r, c, scale, q]);
      }
    }
    scale *= scaleFactor;
  }
  return detections;
}

/** 非极大值抑制：把重叠的检出结果合并为一个簇。 */
export function clusterDetections(dets, iouThreshold) {
  const sorted = dets.slice().sort((a, b) => b[3] - a[3]);
  const iou = (d1, d2) => {
    const overR = Math.max(0, Math.min(d1[0] + d1[2] / 2, d2[0] + d2[2] / 2) - Math.max(d1[0] - d1[2] / 2, d2[0] - d2[2] / 2));
    const overC = Math.max(0, Math.min(d1[1] + d1[2] / 2, d2[1] + d2[2] / 2) - Math.max(d1[1] - d1[2] / 2, d2[1] - d2[2] / 2));
    return (overR * overC) / (d1[2] * d1[2] + d2[2] * d2[2] - overR * overC);
  };
  const assigned = new Array(sorted.length).fill(false);
  const clusters = [];
  for (let i = 0; i < sorted.length; i++) {
    if (assigned[i]) continue;
    let r = 0;
    let c = 0;
    let s = 0;
    let q = 0;
    let n = 0;
    for (let j = i; j < sorted.length; j++) {
      if (iou(sorted[i], sorted[j]) > iouThreshold) {
        assigned[j] = true;
        r += sorted[j][0];
        c += sorted[j][1];
        s += sorted[j][2];
        q += sorted[j][3];
        n += 1;
      }
    }
    clusters.push([r / n, c / n, s / n, q]);
  }
  return clusters;
}

/** 等比缩放后的尺寸（长边不超过 maxSide）。 */
export function fitSide(width, height, maxSide = FACE_DETECT.maxSide) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** RGBA → 灰度（与 pico 示例一致：gray = (2R + 7G + B) / 10）。 */
export function grayFromRgba(rgba, width, height) {
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    gray[i] = (2 * rgba[i * 4] + 7 * rgba[i * 4 + 1] + 1 * rgba[i * 4 + 2]) / 10;
  }
  return gray;
}

/** 面积平均降采样（仅当长边超过 maxSide 时执行）。 */
export function downscaleRgba(rgba, width, height, maxSide) {
  const target = fitSide(width, height, maxSide);
  if (target.width === width && target.height === height) return { rgba, width, height };
  const out = new Uint8ClampedArray(target.width * target.height * 4);
  const bw = width / target.width;
  const bh = height / target.height;
  for (let y = 0; y < target.height; y++) {
    const y0 = Math.floor(y * bh);
    const y1 = Math.min(height, Math.ceil((y + 1) * bh));
    for (let x = 0; x < target.width; x++) {
      const x0 = Math.floor(x * bw);
      const x1 = Math.min(width, Math.ceil((x + 1) * bw));
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * width + xx) * 4;
          r += rgba[i];
          g += rgba[i + 1];
          b += rgba[i + 2];
          n++;
        }
      }
      const o = (y * target.width + x) * 4;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
      out[o + 3] = 255;
    }
  }
  return { rgba: out, width: target.width, height: target.height };
}

/**
 * 判断给定图像中是否包含人脸。
 * @param {Uint8ClampedArray|Uint8Array} rgba RGBA 像素
 * @returns {{detected:boolean, faces:Array<{x:number,y:number,size:number,score:number}>, topScore:number, topSize:number}}
 */
export function detectFace(rgba, width, height, options = {}) {
  const cfg = { ...FACE_DETECT, ...options };
  const scaled = downscaleRgba(rgba, width, height, cfg.maxSide);
  const gray = grayFromRgba(scaled.rgba, scaled.width, scaled.height);
  const dets = runCascade(
    { pixels: gray, nrows: scaled.height, ncols: scaled.width, ldim: scaled.width },
    getCascade(),
    {
      shiftFactor: cfg.shiftFactor,
      minSize: cfg.minSize,
      // 检测窗口最大不超过图像短边的 95%
      maxSize: Math.round(Math.min(scaled.height, scaled.width) * 0.95),
      scaleFactor: cfg.scaleFactor,
    }
  );
  const clusters = clusterDetections(dets, cfg.iouThreshold)
    .filter((d) => d[3] > cfg.scoreThreshold && d[2] >= cfg.minSize)
    .sort((a, b) => b[3] - a[3]);
  const faces = clusters.map((d) => ({ y: d[0], x: d[1], size: d[2], score: d[3] }));
  return {
    detected: faces.length > 0,
    faces,
    // 检测图坐标下的尺寸，便于上层换算
    scaledWidth: scaled.width,
    scaledHeight: scaled.height,
    topScore: faces.length ? faces[0].score : 0,
    topSize: faces.length ? faces[0].size : 0,
  };
}

/** 姿态合格阈值（度）：人脸偏转不超过该角度视为正立，同时用于生成不合格文案 */
const POSE_UPRIGHT_MAX_DEG = 20;

/**
 * 人脸姿态判定参数（H5 / 小程序 / 后台三端同名同值）。
 *
 * 原理：把灰度图按候选朝向旋转后重跑同一级联分类器，得分最高的朝向即人脸朝向。
 * 探测角选 ±40 而不是 ±20：级联得分在偏转 0 处最高、随偏转递减，因此
 * 「把图转 40° 后得分明显更高」等价于「真实偏转已超过约 20°」，正好落在 20° 阈值上；
 * 直接探 ±20 会把实际边界压到 10° 附近，与「不超过 20° 视为合格」不符。
 */
export const FACE_POSE = {
  /** 候选朝向（度）：0 为合格朝向，±40 检验是否偏转超过 20°，±90 为横向，180 为倒置 */
  angles: [0, -40, 40, -90, 90, 180],
  /** 合格阈值（度）：人脸偏转不超过该角度视为正立 */
  uprightMaxDeg: POSE_UPRIGHT_MAX_DEG,
  /**
   * 相对余量：其它朝向得分需比 0° 高出该比例才判定为异常朝向。
   * 实测标定（真实偏转 → ±40 朝向与 0° 的得分比，5 张样张）：18° ≈ 0、20° ≈ 1.00–1.31、
   * 21° ≈ 1.10–1.39、22° ≈ 1.40–1.54、25° ≈ 1.99–3.92、30° ≈ 7–19；
   * 取 1.35 倍正好落在 20° 与 22° 的实测区间之间，使 ≤20° 稳定通过、≥22° 稳定驳回。
   */
  scoreMargin: 0.35,
  /** 姿态分析的分辨率（低于检测分辨率，用于控制耗时） */
  maxSide: 320,
  /** 姿态分析的最小人脸边长（随 maxSide 等比缩小） */
  minSize: 20,
};

/** 定点旋转用的 Q16 余弦/正弦（预计算常量，避免三端运行时三角函数的末位差异）。 */
const POSE_ROTATION = {
  '-40': { cos: 50203, sin: -42126 },
  '40': { cos: 50203, sin: 42126 },
};

/** 姿态不合格的原因文案（三端一致，后台 FaceReview 驳回原因同文）。 */
export const POSE_REASONS = {
  sideways: '检测到照片中的人脸呈横向，请将照片竖直正放后正对镜头重新拍摄',
  'upside-down': '检测到照片中的人脸倒置，请正对镜头重新拍摄',
  tilted: '检测到人脸偏转超过' + POSE_UPRIGHT_MAX_DEG + '°，请保持头部端正、正对镜头重新拍摄',
};

/**
 * 旋转灰度图（整数运算，三端结果一致）。
 * ±90 与 180 用精确的行列映射（无插值误差，±90 同时交换宽高）；
 * 其余角度用中心定点旋转 + 最近邻采样，越界处填 0。
 */
export function rotateGray(gray, width, height, angle) {
  if (angle === 0) return { pixels: gray, width, height };

  if (angle === 180) {
    const out = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      const src = (height - 1 - y) * width;
      for (let x = 0; x < width; x++) out[y * width + x] = gray[src + (width - 1 - x)];
    }
    return { pixels: out, width, height };
  }

  if (angle === 90 || angle === -90) {
    const w = height;
    const h = width;
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        out[y * w + x] = angle === 90
          ? gray[x * width + y]
          : gray[(height - 1 - x) * width + (width - 1 - y)];
      }
    }
    return { pixels: out, width: w, height: h };
  }

  const q = POSE_ROTATION[String(angle)];
  const out = new Uint8Array(width * height);
  const cx = (width / 2) | 0;
  const cy = (height / 2) | 0;
  for (let y = 0; y < height; y++) {
    const dy = y - cy;
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const sx = cx + ((dx * q.cos + dy * q.sin) >> 16);
      const sy = cy + ((-dx * q.sin + dy * q.cos) >> 16);
      out[y * width + x] = (sx >= 0 && sx < width && sy >= 0 && sy < height) ? gray[sy * width + sx] : 0;
    }
  }
  return { pixels: out, width, height };
}

/** 单张灰度图的人脸最高得分（0 表示未检出）。 */
export function topFaceScore(pixels, width, height, cfg) {
  const dets = runCascade(
    { pixels, nrows: height, ncols: width, ldim: width },
    getCascade(),
    {
      shiftFactor: cfg.shiftFactor,
      minSize: cfg.minSize,
      // 检测窗口最大不超过图像短边的 95%
      maxSize: Math.round(Math.min(height, width) * 0.95),
      scaleFactor: cfg.scaleFactor,
    }
  );
  const clusters = clusterDetections(dets, cfg.iouThreshold)
    .filter((d) => d[3] > cfg.scoreThreshold && d[2] >= cfg.minSize)
    .sort((a, b) => b[3] - a[3]);
  return clusters.length
    ? { score: clusters[0][3], size: clusters[0][2], count: clusters.length }
    : { score: 0, size: 0, count: 0 };
}

/**
 * 判断照片中人脸的朝向（横向 / 倒置 / 倾斜超限 / 正立）。
 * @param rgba 传入建议使用与 detectFace 同一份（长边 ≤480）的 RGBA，函数内部再降到姿态分析分辨率
 * @returns 见下方返回对象；pose 取 'upright' | 'tilted' | 'sideways' | 'upside-down' | 'unknown'
 */
export function detectFacePose(rgba, width, height, options = {}) {
  const cfg = { ...FACE_DETECT, ...FACE_POSE, ...options };
  const scaled = downscaleRgba(rgba, width, height, cfg.maxSide);
  const gray = grayFromRgba(scaled.rgba, scaled.width, scaled.height);

  const scores = {};
  let score0 = 0;
  let bestAngle = 0;
  let bestScore = -1;
  let detected = false;
  let faceCount = 0;

  for (const angle of cfg.angles) {
    const rot = rotateGray(gray, scaled.width, scaled.height, angle);
    const r = topFaceScore(rot.pixels, rot.width, rot.height, cfg);
    scores[angle] = r.score;
    if (angle === 0) score0 = r.score;
    if (r.score > 0) {
      detected = true;
      faceCount += r.count;
    }
    if (r.score > bestScore) {
      bestScore = r.score;
      bestAngle = angle;
    }
  }

  // 0° 检出、且其它朝向的得分都没有明显更高 → 人脸正立且偏转不超过阈值
  let upright = false;
  if (score0 > 0) {
    upright = true;
    for (const angle of cfg.angles) {
      if (angle !== 0 && scores[angle] > score0 * (1 + cfg.scoreMargin)) {
        upright = false;
        break;
      }
    }
  }

  let pose = 'unknown';
  if (detected) {
    if (upright) pose = 'upright';
    else if (bestAngle === 90 || bestAngle === -90) pose = 'sideways';
    else if (bestAngle === 180) pose = 'upside-down';
    else pose = 'tilted';
  }

  return {
    detected,
    upright,
    ok: upright,
    pose,
    angle: bestAngle,
    score0,
    bestScore: bestScore > 0 ? bestScore : 0,
    faceCount,
    scores,
    scaledWidth: scaled.width,
    scaledHeight: scaled.height,
  };
}