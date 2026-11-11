import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Input, NavBar, Picker, TextArea, Toast } from 'antd-mobile';
import { CustomerServiceOutlined, FileImageOutlined } from '@ant-design/icons';
import { makeId } from '../lib/utils';

const feedbackTypes = ['消费问题', '门禁问题', '订餐问题', '访客问题', '考勤问题', '其他问题'].map((item) => ({ label: item, value: item }));

export default function Feedback(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const [type, setType] = useState('');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ticketNo, setTicketNo] = useState('');

  const upload = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(event.target.files || []).slice(0, 3 - images.length);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setImages((list) => [...list, String(reader.result)]);
      reader.readAsDataURL(file);
    });
  };

  const submit = (): void => {
    if (!type) { Toast.show({ content: '请选择反馈类型', position: 'center' }); return; }
    if (content.trim().length < 10) { Toast.show({ content: '请至少填写10个字的问题描述', position: 'center' }); return; }
    if (!contact.trim()) { Toast.show({ content: '请输入联系方式', position: 'center' }); return; }
    setLoading(true);
    window.setTimeout(() => {
      setTicketNo(makeId('GD'));
      setLoading(false);
      Toast.show({ content: '反馈已提交，工单已生成', position: 'center' });
    }, 700);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar onBack={() => setLocation('/profile')} className="bg-white">意见反馈</NavBar>
      <div className="p-4 space-y-4">
        {ticketNo ? (
          <Card className="!rounded-2xl !border !border-gray-100 text-center">
            <div className="w-20 h-20 rounded-full bg-green-50 text-green-500 flex items-center justify-center mx-auto mb-4"><CustomerServiceOutlined className="text-4xl" /></div>
            <h1 className="text-xl font-semibold text-gray-900">反馈提交成功</h1>
            <p className="text-sm text-gray-500 mt-2">工单号：<span className="font-mono">{ticketNo}</span></p>
            <p className="text-xs text-gray-400 mt-2">处理结果将通过消息中心通知您，可在帮助中心查看常见问题。</p>
            <div className="flex gap-3 mt-6">
              <Button block fill="outline" onClick={() => setTicketNo('')}>继续反馈</Button>
              <Button block color="primary" onClick={() => setLocation('/profile')}>返回我的</Button>
            </div>
          </Card>
        ) : (
          <Card className="!rounded-2xl !border !border-gray-100">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3"><CustomerServiceOutlined className="text-3xl text-[#0064E6]" /></div>
              <h1 className="text-lg font-semibold text-gray-900">请描述您的问题</h1>
            </div>
            <div className="space-y-4">
              <button className="w-full text-left" onClick={() => setPickerVisible(true)}><span className="text-sm text-gray-600">反馈类型 *</span><div className="mt-2 h-11 bg-gray-50 rounded-xl px-3 flex items-center">{type || '请选择'}</div></button>
              <label className="block"><span className="text-sm text-gray-600">问题描述 *</span><TextArea className="mt-2 !bg-gray-50 !rounded-xl !p-3" rows={5} maxLength={500} showCount value={content} onChange={setContent} placeholder="请详细描述问题现象、发生时间和涉及功能" /></label>
              <div>
                <span className="text-sm text-gray-600">图片上传（最多3张）</span>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {images.map((src, index) => <img key={src.slice(30, 50) + index} src={src} alt={`反馈图片${index + 1}`} className="w-full h-24 object-cover rounded-xl border border-gray-100" />)}
                  {images.length < 3 && (
                    <label className="h-24 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-gray-400 cursor-pointer">
                      <input className="hidden" type="file" accept="image/*" multiple onChange={upload} />
                      <FileImageOutlined className="text-xl" />
                      <span className="text-xs mt-1">上传图片</span>
                    </label>
                  )}
                </div>
              </div>
              <label className="block"><span className="text-sm text-gray-600">联系方式 *</span><Input className="mt-2 !h-12 !bg-gray-50 !rounded-xl !px-4" value={contact} onChange={setContact} placeholder="手机号或邮箱" /></label>
              <Button block color="primary" size="large" loading={loading} className="!rounded-full !h-12" onClick={submit}>提交反馈</Button>
            </div>
          </Card>
        )}

        <Card className="!rounded-2xl !border !border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">其他联系方式</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">客服电话</span><a className="text-[#0064E6]" href="tel:4008888888">400-888-8888</a></div>
            <div className="flex justify-between"><span className="text-gray-500">服务时间</span><span>工作日 9:00-18:00</span></div>
            <div className="flex justify-between"><span className="text-gray-500">服务窗口</span><span>行政楼一楼服务大厅</span></div>
          </div>
        </Card>
      </div>

      <Picker
        columns={[feedbackTypes]}
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onConfirm={(value) => {
          setType(String(value[0] || ''));
          setPickerVisible(false);
        }}
      />
    </div>
  );
}
