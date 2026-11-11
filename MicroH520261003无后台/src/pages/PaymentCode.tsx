import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { NavBar, Card, Tabs, Toast } from 'antd-mobile';
import { LeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';

export default function PaymentCode(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<string>('qr');
  const [qrValue, setQrValue] = useState<string>('');
  const [barcodeValue, setBarcodeValue] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(60);
  const [balance, setBalance] = useState<number>(256.80);

  // 生成随机码
  const generateCode = (): void => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const code = `PAY_${timestamp}_${random}`;
    setQrValue(code);
    setBarcodeValue(random.toUpperCase());
    setCountdown(60);
  };

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
                ¥{balance.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">账户状态</div>
              <div className="text-green-500 font-medium">正常</div>
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
            {activeTab === 'qr' ? (
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-800">食堂消费</div>
                <div className="text-xs text-gray-400">12:15</div>
              </div>
              <div className="text-red-500 font-medium">-15.00</div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-800">超市购物</div>
                <div className="text-xs text-gray-400">昨天 18:30</div>
              </div>
              <div className="text-red-500 font-medium">-28.50</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
