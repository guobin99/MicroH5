import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Checkbox, ImageViewer, NavBar, Tag, Toast } from 'antd-mobile';
import { CameraOutlined, CheckCircleOutlined, CloseCircleOutlined, FileProtectOutlined, ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import { m } from '../lib/api';
import { FACE_DETECT, POSE_REASONS, detectFace, detectFacePose, fitSide } from '../lib/facedetect/pico.js';

interface QualityResult {
  passed: boolean;
  checks: { label: string; passed: boolean; reason?: string }[];
}

const statusText = {
  none: '未采集',
  reviewing: '审核中',
  approved: '已通过',
  rejected: '未通过',
} as const;

// 与后台 face/upload 自动审核保持一致的前端本地估算阈值
// 已取消“竖版正面”形态限制（不再校验宽高比），改为以“能检测到人脸”为核心判定
const FACE_RULES = {
  minBytes: 2 * 1024,
  minSide: 200,
  brightMin: 0.15,
  brightMax: 0.92,
  stdMin: 0.02,
};

const SAMPLE = 32;

interface ImageStats {
  width: number;
  height: number;
  avg: number;
  std: number;
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('image load failed'));
    el.src = src;
  });

// 32×32 降采样估算平均亮度与灰度标准差（与后台审核口径一致）
async function analyzeImage(src: string): Promise<ImageStats | null> {
  try {
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE;
    canvas.height = SAMPLE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { width: img.naturalWidth, height: img.naturalHeight, avg: -1, std: -1 };
    ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
    const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE);
    const lum: number[] = [];
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const value = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
      lum.push(value);
      sum += value;
    }
    const avg = sum / lum.length;
    let variance = 0;
    for (const value of lum) variance += (value - avg) * (value - avg);
    return { width: img.naturalWidth, height: img.naturalHeight, avg, std: Math.sqrt(variance / lum.length) };
  } catch {
    return null;
  }
}

/** 人脸朝向判定结果（detectFacePose 的返回） */
interface FacePose {
  /** 任一朝向下是否检出人脸 */
  detected: boolean;
  /** 朝向是否合格（正立且偏转不超过 20°） */
  ok: boolean;
  /** upright | tilted | sideways | upside-down | unknown */
  pose: string;
}

// 本地人脸检测与姿态判定：把照片等比缩放到长边 480，交给 pico 级联分类器。
// detectFace 判定 0° 朝向是否有人脸（与后台同一口径）；detectFacePose 复用同一份 480 缩放图，
// 再按候选朝向判断人脸是否横向（±90°）/ 倒置（180°）/ 偏转超过 20°。
async function analyzeFace(src: string): Promise<{ detected: boolean; pose: FacePose } | null> {
  try {
    const img = await loadImage(src);
    const size = fitSide(img.naturalWidth, img.naturalHeight, FACE_DETECT.maxSide);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size.width, size.height);
    const { data } = ctx.getImageData(0, 0, size.width, size.height);
    return {
      detected: detectFace(data, size.width, size.height).detected,
      pose: detectFacePose(data, size.width, size.height),
    };
  } catch {
    return null;
  }
}

export default function FaceCollection(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { faceStatus, faceRejectReason, facePhoto, setFaceReviewing, setFaceResult, refreshFaceStatus } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [agreed, setAgreed] = useState(false);
  const [preview, setPreview] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<QualityResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recollectReason, setRecollectReason] = useState('');
  // 已采集照片的大图预览开关（仅在有照片时可打开）
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const agreementItems = useMemo(() => [
    '采集目的：用于刷脸消费、刷脸考勤、刷脸开门等身份识别场景',
    '存储方式：加密存储，按最小必要原则保留',
    '保存期限：按平台策略执行，删除或注销时同步清除',
    '处理方式：采集前单独同意，不合格照片不会被提交',
  ], []);

  const startCapture = (): void => {
    if (!agreed) {
      Toast.show({ content: '请先勾选并同意人脸信息处理授权协议', position: 'center' });
      return;
    }
    if (faceStatus === 'approved' && !recollectReason.trim()) {
      Toast.show({ content: '重新采集需填写原因，例如照片变化或质量不达标', position: 'center' });
      return;
    }
    setStep(2);
  };

  // 采集前本地检查：照片清晰度、亮度，以及是否检测到人脸（核心判定）；
  // 只有检测到人脸且清晰度、亮度达标才允许提交，最终仍由后台自动审核复核
  const inspect = async (url: string, size: number): Promise<void> => {
    setChecking(true);
    setQuality(null);
    const [stats, face] = await Promise.all([analyzeImage(url), analyzeFace(url)]);

    const clarityReasons: string[] = [];
    if (size < FACE_RULES.minBytes) clarityReasons.push('照片过小或不是有效图片');
    if (!stats) {
      clarityReasons.push('照片格式不正确，无法解析');
    } else {
      if (stats.width < FACE_RULES.minSide || stats.height < FACE_RULES.minSide) clarityReasons.push('分辨率过低（需≥200×200）');
      if (stats.std >= 0 && stats.std < FACE_RULES.stdMin) clarityReasons.push('照片内容无效（可能为空白/纯色图）');
    }

    const brightReasons: string[] = [];
    if (!stats) brightReasons.push('无法读取照片内容');
    else if (stats.avg >= 0 && (stats.avg < FACE_RULES.brightMin || stats.avg > FACE_RULES.brightMax)) brightReasons.push('光线过暗或过曝，请重新拍摄');

    const faceReasons: string[] = [];
    if (!face) faceReasons.push('照片无法解析，未能完成人脸检测');
    // 任一朝向下检出人脸即视为「有人脸」，朝向是否合格由下一项「人脸姿态」给出具体原因
    else if (!face.detected && !face.pose.detected) faceReasons.push('未检测到人脸，请确保面部正对镜头、光线充足、无遮挡后重新拍摄');

    // 人脸姿态：仅在姿态分析确实检出人脸、且判定为非正立时才算不通过（无法判定时不阻断提交）
    const poseReasons: string[] = [];
    if (!face) {
      poseReasons.push('照片无法解析，未能完成人脸姿态判定');
    } else if (face.pose.detected && !face.pose.ok) {
      const poseReason = face.pose.pose === 'sideways'
        ? POSE_REASONS.sideways
        : face.pose.pose === 'upside-down'
          ? POSE_REASONS['upside-down']
          : POSE_REASONS.tilted;
      poseReasons.push(poseReason || '人脸朝向不符合要求，请正对镜头、保持头部端正后重新拍摄');
    }

    const checks: QualityResult['checks'] = [
      { label: '照片清晰度', passed: clarityReasons.length === 0, reason: clarityReasons.join('；') || undefined },
      { label: '亮度', passed: brightReasons.length === 0, reason: brightReasons.join('；') || undefined },
      { label: '人脸检测', passed: faceReasons.length === 0, reason: faceReasons.join('；') || undefined },
      { label: '人脸姿态', passed: poseReasons.length === 0, reason: poseReasons.join('；') || undefined },
    ];
    setQuality({ passed: checks.every((item) => item.passed), checks });
    setChecking(false);
  };

  const chooseFile = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      Toast.show({ content: '请选择图片文件', position: 'center' });
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    const url = URL.createObjectURL(selected);
    setFile(selected);
    setPreview(url);
    void inspect(url, selected.size);
  };

  // 附加12：上传后端自动审核，通过则压缩至80K以下存 ST_PersonPhoto
  // 后台审核通过即已落库，提交成功后立即回读真实状态与已采集照片，无需整页刷新
  const submit = (): void => {
    if (!file || !quality) {
      Toast.show({ content: '请先拍照或从相册选择照片', position: 'center' });
      return;
    }
    if (!quality.passed) {
      Toast.show({ content: '照片质检未通过，请按提示重新拍摄', position: 'center' });
      return;
    }
    setSubmitting(true);
    setFaceReviewing();
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = String(reader.result || '');
        const res = await m.faceUpload(base64);
        if (res.approved) {
          setFaceResult(true);
          await refreshFaceStatus();
          setStep(3);
          Toast.show({ content: '审核通过，已采集', position: 'center' });
        } else {
          setFaceResult(false, res.reason);
          setStep(3);
          Toast.show({ content: res.reason || '审核未通过', position: 'center' });
        }
      } catch {
        // 上传失败不进入结果页，按后台真实状态回滚，避免落下与后台不一致的假状态
        await refreshFaceStatus();
        Toast.show({ content: '上传失败，请重试', position: 'center' });
      } finally {
        setSubmitting(false);
      }
    };
    reader.onerror = () => {
      setSubmitting(false);
      void refreshFaceStatus();
      Toast.show({ content: '照片读取失败', position: 'center' });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar onBack={() => setLocation('/')} className="bg-white">人脸采集</NavBar>
      <div className="p-4">
        {step === 1 && (
          <Card className="!rounded-2xl !border !border-gray-100">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CameraOutlined className="text-4xl text-[#0064E6]" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">人脸信息处理授权</h1>
              <div className="mt-2">
                <Tag color={faceStatus === 'approved' ? 'success' : faceStatus === 'reviewing' ? 'warning' : faceStatus === 'rejected' ? 'danger' : 'default'}>
                  当前状态：{statusText[faceStatus]}
                </Tag>
              </div>
              {/* 已通过时展示后台 ST_PersonPhoto 中已采集的人脸照片 */}
              {faceStatus === 'approved' && facePhoto && (
                <div className="mt-4">
                  <img
                    src={facePhoto}
                    alt="已采集的人脸照片"
                    className="w-24 h-24 rounded-full object-cover mx-auto border-2 border-green-100 cursor-zoom-in"
                    onClick={() => setPhotoViewerVisible(true)}
                  />
                  <div className="text-xs text-gray-400 mt-2">已采集人脸照片</div>
                </div>
              )}
              {faceStatus === 'rejected' && faceRejectReason && <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-500">未通过原因：{faceRejectReason}</div>}
            </div>

            <div className="rounded-2xl bg-gray-50 p-4 mb-5">
              <div className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><FileProtectOutlined /> 《人脸信息处理授权协议》要点</div>
              <div className="space-y-3 text-xs text-gray-600 leading-5">
                {agreementItems.map((item, index) => (
                  <div key={item} className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#0064E6] text-white flex items-center justify-center text-[10px] flex-shrink-0">{index + 1}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {faceStatus === 'approved' && (
              <label className="block mb-4">
                <span className="text-sm text-gray-600">重新采集原因 *</span>
                <input className="mt-2 w-full h-11 bg-gray-50 rounded-xl px-3 outline-none" value={recollectReason} onChange={(event) => setRecollectReason(event.target.value)} placeholder="例如：面部特征变化 / 原照片不清晰" />
              </label>
            )}

            <div className="flex items-start gap-2 mb-5">
              <Checkbox checked={agreed} onChange={setAgreed} />
              <span className="text-xs text-gray-500 leading-5">我已阅读并单独同意《人脸信息处理授权协议》，同意采集和处理我的人脸信息。</span>
            </div>
            <Button block color="primary" size="large" className="!rounded-full !h-12" onClick={startCapture}>开始采集</Button>
            <Button block fill="none" className="!mt-2 !text-gray-500" onClick={() => setLocation('/')}>不同意并退出</Button>
          </Card>
        )}

        {step === 2 && (
          <Card className="!rounded-2xl !border !border-gray-100">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">请拍摄能清晰看到人脸的照片</h2>
              <p className="text-sm text-gray-500 mt-1">五官清晰、无遮挡、光线均匀，竖版横版均可</p>
            </div>

            <button className="relative w-full max-w-[280px] h-80 mx-auto rounded-3xl overflow-hidden bg-gray-900 flex items-center justify-center" onClick={() => inputRef.current?.click()}>
              {preview ? (
                <img src={preview} alt="人脸照片预览" className="w-full h-full object-cover" />
              ) : (
                <div className="text-white text-center">
                  <CameraOutlined className="text-5xl mb-3" />
                  <div className="text-sm">点击调用摄像头/相册</div>
                </div>
              )}
              <div className="absolute inset-8 border-2 border-dashed border-white/70 rounded-[40%]" />
              <div className="absolute top-4 left-4 w-7 h-7 border-t-4 border-l-4 border-[#52C7FF] rounded-tl-xl" />
              <div className="absolute top-4 right-4 w-7 h-7 border-t-4 border-r-4 border-[#52C7FF] rounded-tr-xl" />
              <div className="absolute bottom-4 left-4 w-7 h-7 border-b-4 border-l-4 border-[#52C7FF] rounded-bl-xl" />
              <div className="absolute bottom-4 right-4 w-7 h-7 border-b-4 border-r-4 border-[#52C7FF] rounded-br-xl" />
            </button>
            <input ref={inputRef} className="hidden" type="file" accept="image/*" capture="user" onChange={chooseFile} />

            {checking && <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-[#0064E6] text-center">正在进行质量检测、人脸检测与姿态判定…</div>}
            {quality && (
              <>
                <div className={`mt-4 rounded-2xl p-4 ${quality.passed ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className={`font-semibold mb-3 ${quality.passed ? 'text-green-700' : 'text-red-600'}`}>{quality.passed ? '质检通过' : '质检未通过'}</div>
                  <div className="space-y-2 text-xs">
                    {quality.checks.map((item) => (
                      <div key={item.label} className="flex items-start gap-2">
                        {item.passed ? <CheckCircleOutlined className="text-green-500 mt-0.5" /> : <CloseCircleOutlined className="text-red-500 mt-0.5" />}
                        <span className={item.passed ? 'text-gray-600' : 'text-red-500'}>{item.label}{item.reason ? `：${item.reason}` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* 人脸检测与人脸姿态判定均已在本地完成，提交后仍由平台自动审核复核 */}
                <div className="mt-3 rounded-2xl bg-gray-50 p-4 text-xs text-gray-500 leading-6">
                  <div className="font-semibold text-gray-700 mb-2">提交前提示</div>
                  <div>• 照片需能清晰看到人脸，用于刷脸消费、刷脸考勤、刷脸开门等身份识别场景。</div>
                  <div>• 竖版、横版均可，人脸完整、无遮挡、光线均匀即可。</div>
                  <div>• 本地会自动检测照片中的人脸并判断朝向；未检出人脸、或人脸横向 / 倒置 / 偏转超过 20° 时无法提交。</div>
                  <div>• 人脸信息将加密存储，未通过校验的照片不会入库。</div>
                </div>
              </>
            )}

            <div className="flex gap-3 mt-6">
              <Button block fill="outline" onClick={() => inputRef.current?.click()}><ReloadOutlined /> 重新拍摄</Button>
              <Button block color="primary" loading={submitting} disabled={!quality?.passed} onClick={submit}>提交审核</Button>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="!rounded-2xl !border !border-gray-100 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${faceStatus === 'approved' ? 'bg-green-50' : 'bg-red-50'}`}>
              {faceStatus === 'approved'
                ? <SafetyCertificateOutlined className="text-4xl text-green-500" />
                : <CloseCircleOutlined className="text-4xl text-red-500" />}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{faceStatus === 'approved' ? '采集成功' : '采集未通过'}</h2>
            <p className="text-sm text-gray-500 mt-2">
              {faceStatus === 'approved'
                ? '照片已通过系统自动审核并完成采集，人脸信息已保存。'
                : (faceRejectReason || '照片未通过系统自动审核，请调整后重新拍摄。')}
            </p>
            {faceStatus === 'approved' && facePhoto && (
              <img
                src={facePhoto}
                alt="已采集的人脸照片"
                className="w-24 h-24 rounded-full object-cover mx-auto mt-4 border-2 border-green-100 cursor-zoom-in"
                onClick={() => setPhotoViewerVisible(true)}
              />
            )}
            <div className={`mt-6 rounded-2xl p-4 text-left text-xs leading-6 ${faceStatus === 'approved' ? 'bg-blue-50 text-[#0064E6]' : 'bg-red-50 text-red-500'}`}>
              {faceStatus === 'approved' ? (
                <>
                  <div>• 人脸状态已更新为“已通过”。</div>
                  <div>• 可用于刷脸消费、刷脸考勤、刷脸开门等身份识别场景。</div>
                  <div>• 面部特征变化或照片不清晰时，可随时重新采集。</div>
                </>
              ) : (
                <>
                  <div>• 照片未通过自动审核，人脸信息未保存。</div>
                  <div>• 建议光线均匀、五官清晰、无遮挡后重新拍摄。</div>
                </>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              {faceStatus !== 'approved' && (
                <Button block fill="outline" onClick={() => { setPreview(''); setQuality(null); setStep(2); }}><ReloadOutlined /> 重新拍摄</Button>
              )}
              <Button block color="primary" className="!rounded-full" onClick={() => setLocation('/')}>完成</Button>
            </div>
          </Card>
        )}
      </div>

      {/* 点击已采集的人脸照片查看完整大图（有照片时才会挂载） */}
      {faceStatus === 'approved' && facePhoto && (
        <ImageViewer.Multi
          visible={photoViewerVisible}
          images={[facePhoto]}
          defaultIndex={0}
          onClose={() => setPhotoViewerVisible(false)}
        />
      )}
    </div>
  );
}