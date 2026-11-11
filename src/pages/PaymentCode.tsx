import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { NavBar, Card, Tabs, Toast } from 'antd-mobile';
import { LeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import dayjs from 'dayjs';
import { m } from '../lib/api';
import { useApp } from '../context/AppContext';
import { accountStatusText, formatMoney } from '../lib/utils';

export default function PaymentCode(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<string>('qr');
  const [qrValue, setQrValue] = useState<string>('');
  const [barcodeValue, setBarcodeValue] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(60);
  // 余额与状态使用真实账户数据（来自后端 profile 同步，写入 AppContext）
  const { account } = useApp();
  // 与小程序端一致：仅 normal 状态可展示付款码，挂失/冻结时隐藏
  const available = account.status === 'normal';
  // 最近消费：从后台获取（XF_Consume，/m/account/consumptions）
  const [recentConsumption, setRecentConsumption] = useState<{ id: string; title: string; timeText: string; amountText: string; isRefund: boolean }[]>([]);

  // 附加3：付款码从后端获取（SK_ScanCode）
  const generateCode = async (): Promise<void> => {
    try {
      const r = await m.payCode();
      if (r && r.code) {
        setQrValue(r.code);
        setBarcodeValue(r.code.replace(/\|/g, '').slice(-12).toUpperCase());
        setCountdown(r.expireSeconds || 60);
      }
    } catch {
      Toast.show({ content: '获取付款码失败' });
    }
  };

  // 最近消费从后台获取（附加4：XF_Consume 消费记录）
  useEffect(() => {
    const today = dayjs();
    m.consumptions(today.subtract(7, 'day').format('YYYY-MM-DD'), today.format('YYYY-MM-DD')).then((rows) => {
      if (!Array.isArray(rows)) return;
      setRecentConsumption(rows.slice(0, 3).map((r: any) => {
        const amount = Number(r.amount || 0);
        // Consume_Fund < 0 为退款（入账 +），否则为消费（扣款 -）
        const isRefund = amount < 0;
        return {
          id: String(r.id),
          title: [r.repastName, r.mocName].filter(Boolean).join(' · ') || (r.remark || '消费'),
          timeText: (r.time || '').replace('T', ' ').substring(5, 16),
          amountText: `${isRefund ? '+' : '-'}${formatMoney(Math.abs(amount))}`,
          isRefund,
        };
      }));
    }).catch(() => {});
  }, []);

  // 初始化和倒计时
  useEffect(() => {
    generateCode();
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          generateCode();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleRefresh = (): void => {
    generateCode();
    Toast.show({ content: '已刷新', position: 'center' });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar
        onBack={() => setLocation('/')}
        className="bg-white"
      >
        付款码
      </NavBar>

      <div className="px-4 py-4">
        {/* Balance Info */}
        <Card className="!rounded-xl mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">当前余额</div>
              <div className="text-2xl font-bold text-gray-800">
                ¥{formatMoney(account.balance)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">账户状态</div>
              <div className={`font-medium ${account.status === 'normal' ? 'text-green-500' : 'text-red-500'}`}>
                {accountStatusText(account.status)}
              </div>
            </div>
          </div>
        </Card>

        {/* Code Card */}
        <Card className="!rounded-xl !shadow-lg">
          <Tabs activeKey={activeTab} onChange={setActiveTab} className="mb-4">
            <Tabs.Tab title="二维码" key="qr" />
            <Tabs.Tab title="条形码" key="barcode" />
          </Tabs>

          <div className="flex flex-col items-center py-6">
            {!available ? (
              <div className="flex flex-col items-center text-center py-8">
                <div className="text-5xl mb-3">⛔</div>
                <div className="font-medium text-gray-800">付款码暂不可用</div>
                <div className="text-xs text-gray-400 mt-2">
                  账户{accountStatusText(account.status)}，请先解除挂失或联系管理员
                </div>
              </div>
            ) : activeTab === 'qr' ? (
              <>
                <div className="p-4 bg-white rounded-xl shadow-inner">
                  <QRCodeSVG
                    value={qrValue}
                    size={200}
                    level="H"
                  />
                </div>
                <div className="text-xs text-gray-400 mt-4">
                  请向收银员出示此二维码
                </div>
              </>
            ) : (
              <>
                <div className="w-full h-24 bg-white rounded-xl flex items-center justify-center px-4">
                  <div className="text-3xl font-mono tracking-widest">
                    {barcodeValue}
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-4">
                  请向收银员出示此条形码
                </div>
              </>
            )}

            {/* Countdown */}
            <div className="flex items-center gap-2 mt-6 text-sm text-gray-500">
              <span>{countdown}秒后自动刷新</span>
              <ReloadOutlined
                className="cursor-pointer hover:text-blue-500"
                onClick={handleRefresh}
              />
            </div>
          </div>

          {/* Warning */}
          <div className="bg-orange-50 rounded-lg p-3 mt-4">
            <div className="text-xs text-orange-600">
              <div className="font-medium mb-1">安全提示：</div>
              <div>• 付款码请勿截图或分享给他人</div>
              <div>• 每分钟自动刷新，截屏无效</div>
              <div>• 余额不足时将无法完成支付</div>
            </div>
          </div>
        </Card>

        {/* Recent Transactions */}
        <Card className="!rounded-xl mt-4">
          <div className="text-sm font-medium text-gray-800 mb-4">最近消费</div>
          {recentConsumption.length > 0 ? (
            <div className="space-y-3">
              {recentConsumption.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-800">{item.title}</div>
                    <div className="text-xs text-gray-400">{item.timeText}</div>
                  </div>
                  <div className={`font-medium ${item.isRefund ? 'text-green-500' : 'text-red-500'}`}>{item.amountText}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-400 text-center py-4">暂无消费记录</div>
          )}
        </Card>
      </div>
    </div>
  );
}
