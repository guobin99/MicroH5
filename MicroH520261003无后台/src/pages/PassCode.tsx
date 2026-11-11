import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, NavBar, Tag, Toast } from 'antd-mobile';
import { CheckCircleOutlined, CloseCircleOutlined, GatewayOutlined, HistoryOutlined, ReloadOutlined, RightOutlined } from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../context/AppContext';
import { accountStatusText } from '../lib/utils';

export default function PassCode(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { user, account } = useApp();
  const [qrValue, setQrValue] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [lastResult, setLastResult] = useState({ door: '办公楼大厅', time: '2026-10-01 08:32', result: '开门成功' });
  const available = account.status === 'normal';

  const generateCode = (): void => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 10).toUpperCase();
    setQrValue(`PASS|${user.employeeNo}|${timestamp}|${random}`);
    setCountdown(60);
  };

  useEffect(() => {
    generateCode();
    const timer = window.setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          generateCode();
          return 60;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const doorPermissions = useMemo(() => [
    { name: '办公区域', authorized: true },
    { name: '食堂区域', authorized: true },
    { name: '宿舍区域', authorized: true },
    { name: '档案室', authorized: false },
  ], []);

  const handleRefresh = (): void => {
    generateCode();
    Toast.show({ content: '通行码已刷新', position: 'center' });
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar
        onBack={() => setLocation('/')}
        className="bg-white"
        right={<Button size="small" fill="outline" onClick={() => setLocation('/access-records')}><HistoryOutlined /> 记录</Button>}
      >
        通行码
      </NavBar>

      <div className="p-4 space-y-4">
        <Card className="!rounded-2xl !border !border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 text-2xl">
              <GatewayOutlined />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-semibold text-gray-900">{user.name}</div>
              <div className="text-sm text-gray-500 mt-1">{user.department} · 工号 {user.employeeNo}</div>
            </div>
            <Tag color={available ? 'success' : 'danger'}>{accountStatusText(account.status)}</Tag>
          </div>
        </Card>

        <Card className="!rounded-3xl !border !border-gray-100 !shadow-md">
          {!available ? (
            <div className="py-12 text-center">
              <CloseCircleOutlined className="text-5xl text-red-500" />
              <h2 className="text-lg font-semibold text-gray-900 mt-4">通行码暂不可用</h2>
              <p className="text-sm text-gray-500 mt-2">账户{accountStatusText(account.status)}，请联系管理员或先解除挂失。</p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4">
              <div className="p-5 bg-white rounded-2xl border-2 border-purple-100 shadow-inner">
                <QRCodeSVG value={qrValue} size={220} level="H" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mt-5">个人通行二维码</h2>
              <p className="text-sm text-gray-500 mt-2">请在门禁设备前出示，权限以平台授权为准</p>
              <div className="flex items-center gap-2 mt-5 text-sm text-gray-500">
                <span>{countdown}秒后自动刷新</span>
                <button aria-label="刷新通行码" onClick={handleRefresh}>
                  <ReloadOutlined className="text-purple-600" />
                </button>
              </div>
            </div>
          )}

          <div className="bg-purple-50 rounded-2xl p-4 mt-4">
            <div className="text-sm font-semibold text-purple-900 mb-3">当前权限</div>
            <div className="grid grid-cols-2 gap-2">
              {doorPermissions.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-xs text-purple-700">
                  {item.authorized ? <CheckCircleOutlined className="text-green-500" /> : <CloseCircleOutlined className="text-red-500" />}
                  {item.name} · {item.authorized ? '已授权' : '无权限'}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-orange-50 rounded-2xl p-3 mt-4 text-xs text-orange-700 leading-5">
            <div className="font-semibold mb-1">使用提示</div>
            <div>• 通行码一次性有效、60秒自动刷新，请勿截图或转发。</div>
            <div>• 人员离职、账户冻结或权限被收回时，通行码自动失效。</div>
          </div>
        </Card>

        <button className="w-full text-left" onClick={() => setLocation('/access-records')}>
          <Card className="!rounded-2xl !border !border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">最近一次通行</div>
                <div className="font-semibold text-gray-900 mt-1">{lastResult.door} · {lastResult.result}</div>
                <div className="text-xs text-gray-400 mt-1">{lastResult.time}</div>
              </div>
              <RightOutlined className="text-gray-300" />
            </div>
          </Card>
        </button>
      </div>
    </div>
  );
}
