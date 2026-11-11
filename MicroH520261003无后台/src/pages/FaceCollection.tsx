import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Checkbox, NavBar, Tag, Toast } from 'antd-mobile';
import { CameraOutlined, CheckCircleOutlined, CloseCircleOutlined, FileProtectOutlined, ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useApp } from '../context/AppContext';

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

export default function FaceCollection(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { faceStatus, faceRejectReason, setFaceReviewing, setFaceResult } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [agreed, setAgreed] = useState(false);
  const [preview, setPreview] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<QualityResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recollectReason, setRecollectReason] = useState('');

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const agreementItems = useMemo(() => [
    '采集目的：用于刷脸消费、刷脸开门等身份识别场景',
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

  const inspect = (selected: File): void => {
    setChecking(true);
    setQuality(null);
    window.setTimeout(() => {
      const tooSmall = selected.size < 10 * 1024;
      const checks = [
        { label: '检测到单一人脸', passed: true },
        { label: '正脸角度符合要求', passed: true },
        { label: '照片清晰度', passed: !tooSmall, reason: tooSmall ? '照片过小或模糊，请在光线充足处重新拍摄' : undefined },
        { label: '亮度与遮挡', passed: !selected.name.toLowerCase().includes('dark'), reason: selected.name.toLowerCase().includes('dark') ? '照片偏暗或存在遮挡' : undefined },
        { label: '本人一致性（可选）', passed: true },
      ];
      setQuality({ passed: checks.every((item) => item.passed), checks });
      setChecking(false);
    }, 800);
  };

  const chooseFile = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      Toast.show({ content: '请选择图片文件', position: 'center' });
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    inspect(selected);
  };

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
    window.setTimeout(() => {
      setFaceReviewing();
      setStep(3);
      setSubmitting(false);
      Toast.show({ content: '已提交审核', position: 'center' });
      window.setTimeout(() => setFaceResult(true), 1500);
    }, 700);
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
              <h2 className="text-lg font-semibold text-gray-900">请拍摄正面免冠照片</h2>
              <p className="text-sm text-gray-500 mt-1">五官清晰、无遮挡、光线均匀</p>
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

            {checking && <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-[#0064E6] text-center">正在进行质量检测…</div>}
            {quality && (
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
            )}

            <div className="flex gap-3 mt-6">
              <Button block fill="outline" onClick={() => inputRef.current?.click()}><ReloadOutlined /> 重新拍摄</Button>
              <Button block color="primary" loading={submitting} disabled={!quality?.passed} onClick={submit}>提交审核</Button>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="!rounded-2xl !border !border-gray-100 text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <SafetyCertificateOutlined className="text-4xl text-green-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">提交成功</h2>
            <p className="text-sm text-gray-500 mt-2">照片已通过前端质检，正在等待平台审核与下发。</p>
            <div className="mt-6 rounded-2xl bg-blue-50 p-4 text-left text-xs text-[#0064E6] leading-6">
              <div>• 审核结果将通过公众号消息推送。</div>
              <div>• 审核通过后同步下发至授权人脸设备。</div>
              <div>• 当前为前端演示，正式环境由服务端完成加密传输、质检与审核。</div>
            </div>
            <Button block color="primary" className="!rounded-full mt-6" onClick={() => setLocation('/')}>完成</Button>
          </Card>
        )}
      </div>
    </div>
  );
}
