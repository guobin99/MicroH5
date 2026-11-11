import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Input, NavBar, Toast } from 'antd-mobile';
import { MobileOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import { m } from '../lib/api';

export default function PhoneChange(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { user, updatePhone } = useApp();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = window.setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  // 附加2：阿里云短信
  const sendCode = async (): Promise<void> => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      Toast.show({ content: '请输入正确的新手机号', position: 'center' });
      return;
    }
    const res = await m.sendSms(phone, 'changephone');
    if (res.success) {
      setCountdown(60);
      Toast.show({ content: '验证码已发送', position: 'center' });
    } else {
      Toast.show({ content: res.msg || '发送失败', position: 'center' });
    }
  };

  const submit = async (): Promise<void> => {
    if (!/^1[3-9]\d{9}$/.test(phone)) { Toast.show({ content: '请输入正确的新手机号', position: 'center' }); return; }
    if (!/^\d{6}$/.test(code)) { Toast.show({ content: '请输入6位验证码', position: 'center' }); return; }
    setLoading(true);
    try {
      await updatePhone(phone, code);
      Toast.show({ content: '手机号更换成功', position: 'center' });
      setLocation('/profile');
    } catch (error) {
      Toast.show({ content: error instanceof Error ? error.message : '修改失败', position: 'center' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar onBack={() => setLocation('/profile')} className="bg-white">更换手机号</NavBar>
      <div className="p-4 space-y-4">
        <Card className="!rounded-2xl !border !border-gray-100">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4"><MobileOutlined className="text-4xl text-[#0064E6]" /></div>
            <h1 className="text-xl font-semibold text-gray-900">更换绑定手机号</h1>
            <p className="text-xs text-gray-500 mt-2">当前手机号：{user.phone}</p>
          </div>
          <div className="space-y-4">
            <label className="block"><span className="text-sm text-gray-600">新手机号 *</span><Input className="mt-2 !h-12 !bg-gray-50 !rounded-xl !px-4" type="tel" value={phone} onChange={setPhone} placeholder="请输入新手机号" /></label>
            <label className="block"><span className="text-sm text-gray-600">短信验证码 *</span><div className="flex gap-2 mt-2"><Input className="!h-12 !bg-gray-50 !rounded-xl !px-4" type="number" value={code} onChange={setCode} placeholder="6位验证码" /><Button className="!h-12 !rounded-xl !w-28 !shrink-0 !whitespace-nowrap" disabled={countdown > 0} onClick={sendCode}>{countdown > 0 ? `${countdown}s` : '获取验证码'}</Button></div></label>
            <Button block color="primary" size="large" loading={loading} className="!rounded-full !h-12" onClick={submit}>确认更换</Button>
          </div>
        </Card>
        <Card className="!rounded-2xl !border !border-blue-100 !bg-blue-50">
          <div className="flex gap-3 text-xs text-[#0064E6] leading-5"><SafetyCertificateOutlined className="text-xl" /><span>手机号用于身份验证和消息通知，正式环境由服务端完成短信校验并留存操作日志。</span></div>
        </Card>
      </div>
    </div>
  );
}
