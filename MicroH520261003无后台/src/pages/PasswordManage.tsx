import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Input, NavBar, Tabs, Toast } from 'antd-mobile';
import { LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useApp } from '../context/AppContext';

type Mode = 'change' | 'reset';

export default function PasswordManage(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { user } = useApp();
  const [mode, setMode] = useState<Mode>('change');
  const [oldPassword, setOldPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [idCard, setIdCard] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = window.setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  const sendCode = (): void => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      Toast.show({ content: '请输入正确手机号', position: 'center' });
      return;
    }
    setCountdown(60);
    Toast.show({ content: '验证码已发送（演示）', position: 'center' });
  };

  const validate = (): boolean => {
    if (mode === 'change' && oldPassword.length < 4) {
      Toast.show({ content: '请输入原密码', position: 'center' });
      return false;
    }
    if (mode === 'reset') {
      if (!/^1[3-9]\d{9}$/.test(phone)) { Toast.show({ content: '请输入正确手机号', position: 'center' }); return false; }
      if (!/^\d{6}$/.test(code)) { Toast.show({ content: '请输入6位验证码', position: 'center' }); return false; }
      if (!/^\d{17}[\dXx]$/.test(idCard)) { Toast.show({ content: '请输入正确身份证号用于身份核验', position: 'center' }); return false; }
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{4,20}$/.test(newPassword)) {
      Toast.show({ content: '新密码需为4-20位且同时包含字母和数字', position: 'center' });
      return false;
    }
    if (newPassword !== confirmPassword) {
      Toast.show({ content: '两次输入的新密码不一致', position: 'center' });
      return false;
    }
    return true;
  };

  const submit = (): void => {
    if (!validate()) return;
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      Toast.show({ content: mode === 'change' ? '密码修改成功' : '密码重置成功', position: 'center' });
      setLocation('/profile');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar onBack={() => setLocation('/profile')} className="bg-white">密码管理</NavBar>
      <Tabs activeKey={mode} onChange={(key) => setMode(key as Mode)} className="bg-white">
        <Tabs.Tab title="修改密码" key="change" />
        <Tabs.Tab title="忘记密码" key="reset" />
      </Tabs>

      <div className="p-4 space-y-4">
        <Card className="!rounded-2xl !border !border-gray-100">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <LockOutlined className="text-4xl text-[#0064E6]" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">{mode === 'change' ? '修改一卡通密码' : '重置一卡通密码'}</h1>
            <p className="text-xs text-gray-500 mt-2">密码用于消费验证和账户查询，请妥善保管</p>
          </div>

          <div className="space-y-4">
            {mode === 'change' ? (
              <label className="block"><span className="text-sm text-gray-600">原密码 *</span><Input className="mt-2 !h-12 !bg-gray-50 !rounded-xl !px-4" type="password" value={oldPassword} onChange={setOldPassword} placeholder="请输入原密码" /></label>
            ) : (
              <>
                <label className="block"><span className="text-sm text-gray-600">绑定手机号 *</span><Input className="mt-2 !h-12 !bg-gray-50 !rounded-xl !px-4" type="tel" value={phone} onChange={setPhone} placeholder={`当前：${user.phone}`} /></label>
                <label className="block"><span className="text-sm text-gray-600">短信验证码 *</span><div className="flex gap-2 mt-2"><Input className="!h-12 !bg-gray-50 !rounded-xl !px-4" type="number" value={code} onChange={setCode} placeholder="6位验证码" /><Button className="!h-12 !rounded-xl" disabled={countdown > 0} onClick={sendCode}>{countdown > 0 ? `${countdown}s` : '获取验证码'}</Button></div></label>
                <label className="block"><span className="text-sm text-gray-600">身份证号 *</span><Input className="mt-2 !h-12 !bg-gray-50 !rounded-xl !px-4" value={idCard} onChange={setIdCard} placeholder="用于身份要素校验" /></label>
              </>
            )}
            <label className="block"><span className="text-sm text-gray-600">新密码 *</span><Input className="mt-2 !h-12 !bg-gray-50 !rounded-xl !px-4" type="password" value={newPassword} onChange={setNewPassword} placeholder="4-20位，含字母和数字" /></label>
            <label className="block"><span className="text-sm text-gray-600">确认新密码 *</span><Input className="mt-2 !h-12 !bg-gray-50 !rounded-xl !px-4" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="请再次输入新密码" /></label>
            <Button block color="primary" size="large" loading={loading} className="!rounded-full !h-12" onClick={submit}>{mode === 'change' ? '确认修改' : '确认重置'}</Button>
          </div>
        </Card>

        <Card className="!rounded-2xl !border !border-blue-100 !bg-blue-50">
          <div className="flex gap-3 text-xs text-[#0064E6] leading-5">
            <SafetyCertificateOutlined className="text-xl flex-shrink-0" />
            <div>修改或重置密码属于关键操作，正式环境将进行短信/身份要素校验、服务端签名验证并留存操作日志。</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
