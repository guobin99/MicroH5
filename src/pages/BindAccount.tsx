import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Checkbox, Input, NavBar, Tabs, Toast } from 'antd-mobile';
import { SafetyCertificateOutlined, UserOutlined, WechatOutlined } from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import { m } from '../lib/api';
import { isWeChatBrowser, normalizeRedirect } from '../lib/auth';

const WX_APPID = ((import.meta as any).env?.VITE_WX_APP_ID as string) || '';
export default function BindAccount(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { isBound, user, bindAccount, unbindAccount } = useApp();
  const [method, setMethod] = useState<'password' | 'sms'>('sms');
  const [name, setName] = useState('');
  const [employeeNo, setEmployeeNo] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = window.setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  // 附加2：阿里云短信验证码
  const sendVerifyCode = async (): Promise<void> => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      Toast.show({ content: '请先输入正确的手机号', position: 'center' });
      return;
    }
    const r = await m.sendSms(phone, 'bind');
    if (r.success) {
      setCountdown(60);
      Toast.show({ content: '验证码已发送', position: 'center' });
    } else {
      Toast.show({ content: r.msg || '发送失败', position: 'center' });
    }
  };

  const validate = (): boolean => {
    if (!name.trim()) {
      Toast.show({ content: '请输入姓名', position: 'center' });
      return false;
    }
    if (!employeeNo.trim()) {
      Toast.show({ content: '请输入工号/学号', position: 'center' });
      return false;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      Toast.show({ content: '请输入正确的手机号', position: 'center' });
      return false;
    }
    if (method === 'password' && password.length < 4) {
      Toast.show({ content: '请输入至少4位账户密码', position: 'center' });
      return false;
    }
    if (method === 'sms' && !/^\d{6}$/.test(verifyCode)) {
      Toast.show({ content: '请输入6位手机验证码', position: 'center' });
      return false;
    }
    if (!agreed) {
      Toast.show({ content: '请阅读并同意绑定协议', position: 'center' });
      return false;
    }
    return true;
  };

  // 对接后端：工号(Person_No)+账户密码/短信验证码 登录并绑定微信 OpenID（附加5/附加7）
  // 微信内且尚未拿到授权 code 时，先走 OAuth2 静默授权（完成后回来自动填充 OpenID 绑定，附加7）
  useEffect(() => {
    if (isBound) return; // 已登录无需再走微信授权
    if (!isWeChatBrowser()) return;
    // 已有 openid 或 code 则不再跳转授权
    if (window.sessionStorage.getItem('ylt-wx-openid')) return;
    if (window.sessionStorage.getItem('ylt-wx-code')) return;
    // 只在本次会话自动发起一次：授权失败会回跳绑定页，若不限制会「回绑定页→立刻再授权」死循环，
    // 页面表现就是一直卡在「微信授权中…」。失败后允许用户直接用密码/短信绑定。
    if (window.sessionStorage.getItem('ylt-oauth-tried') === '1') return;
    window.sessionStorage.setItem('ylt-oauth-tried', '1');
    const redirect = normalizeRedirect(window.sessionStorage.getItem('ylt-redirect-after-bind') || '/');
    window.sessionStorage.setItem('ylt-wx-redirect', redirect);
    window.location.hash = '#/wx-oauth';
  }, [isBound]);

  const handleSubmit = async (): Promise<void> => {
    if (!validate()) return;
    setLoading(true);
    try {
      await bindAccount({
        name: name.trim(),
        employeeNo: employeeNo.trim(),
        phone,
        password: method === 'password' ? password : undefined,
        verifyCode: method === 'sms' ? verifyCode : undefined,
      });
      Toast.show({ content: '绑定成功', position: 'center' });
      const redirect = window.sessionStorage.getItem('ylt-redirect-after-bind') || '/';
      window.sessionStorage.removeItem('ylt-redirect-after-bind');
      setLocation(redirect);
    } catch (error) {
      const message = error instanceof Error ? error.message : '绑定失败';
      Toast.show({ content: message, position: 'center' });
    } finally {
      setLoading(false);
    }
  };

  if (isBound) {
    return (
      <div className="min-h-screen bg-[#F5F7FA]">
        <NavBar onBack={() => setLocation('/profile')} className="bg-white">账户绑定</NavBar>
        <div className="p-4">
          <Card className="!rounded-2xl !border !border-gray-100">
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <SafetyCertificateOutlined className="text-4xl text-green-500" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">当前账户已绑定</h1>
              <p className="text-sm text-gray-500 mt-2">{user.name} · 工号 {user.employeeNo}</p>
              <p className="text-xs text-gray-400 mt-1">一个微信仅可绑定一个有效人员账户</p>
              <div className="flex gap-3 mt-8">
                <Button block fill="outline" onClick={() => setLocation('/')}>返回首页</Button>
                <Button
                  block
                  color="danger"
                  fill="outline"
                  onClick={() => {
                    unbindAccount().then(() => {
                      Toast.show({ content: '已解绑，请重新验证', position: 'center' });
                    }).catch(() => {
                      Toast.show({ content: '解绑失败', position: 'center' });
                    });
                  }}
                >
                  解绑
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar className="bg-white" backArrow={false}>账户绑定</NavBar>
      <div className="p-4 space-y-4">
        <Card className="!rounded-2xl !border !border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center text-2xl">
              <WechatOutlined />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900">微信授权成功</div>
              <div className="text-xs text-gray-500 mt-1">微信已授权，请绑定您的一脸通账户后使用业务功能</div>
            </div>
          </div>
        </Card>

        <Card className="!rounded-2xl !border !border-gray-100">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <UserOutlined className="text-3xl text-[#0064E6]" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">验证身份信息</h1>
            <p className="text-xs text-gray-500 mt-2">姓名 + 工号/学号 + 账户密码或手机验证码</p>
          </div>

          <Tabs activeKey={method} onChange={(key) => setMethod(key as 'password' | 'sms')}>
            <Tabs.Tab title="手机验证码" key="sms" />
            <Tabs.Tab title="账户密码" key="password" />
          </Tabs>

          <div className="space-y-4 mt-5">
            <label className="block">
              <span className="text-sm text-gray-600">姓名</span>
              <Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" placeholder="请输入姓名" value={name} onChange={setName} />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">工号/学号</span>
              <Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" placeholder="请输入身份编号" value={employeeNo} onChange={setEmployeeNo} />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">手机号</span>
              <Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" placeholder="请输入平台预留手机号" type="tel" value={phone} onChange={setPhone} />
            </label>

            {method === 'sms' ? (
              <label className="block">
                <span className="text-sm text-gray-600">手机验证码</span>
                <div className="flex gap-2 mt-2">
                  <Input className="!h-11 !bg-gray-50 !rounded-xl !px-3" placeholder="6位验证码" type="number" value={verifyCode} onChange={setVerifyCode} />
                  <Button className="!h-11 !rounded-xl !w-28 !shrink-0 !whitespace-nowrap" disabled={countdown > 0} onClick={sendVerifyCode}>
                    {countdown > 0 ? `${countdown}s` : '获取验证码'}
                  </Button>
                </div>
              </label>
            ) : (
              <label className="block">
                <span className="text-sm text-gray-600">账户密码</span>
                <Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" placeholder="请输入账户密码" type="password" value={password} onChange={setPassword} />
              </label>
            )}

            <div className="flex items-start gap-2 pt-1">
              <Checkbox checked={agreed} onChange={setAgreed} />
              <span className="text-xs text-gray-500 leading-5">
                我已阅读并同意
                <span
                  className="text-[#0064E6]"
                  onClick={(e) => { e.stopPropagation(); setLocation('/agreement'); }}
                >《账户绑定协议》</span>
                ，了解一个微信仅允许绑定一个有效人员账户，换绑前需先解绑。
              </span>
            </div>

            <Button block color="primary" size="large" loading={loading} className="!rounded-full !h-12" onClick={handleSubmit}>
              确认绑定
            </Button>
          </div>
        </Card>

        <div className="text-xs text-gray-400 text-center leading-5">
          登录态采用服务端会话管理（默认7天），已对接微信授权与一脸通平台身份校验接口。
        </div>
      </div>
    </div>
  );
}
