import React, { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Checkbox, Dialog, Input, NavBar, Tag, Toast } from 'antd-mobile';
import { CheckCircleOutlined, ClockCircleOutlined, PayCircleOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import { formatMoney } from '../lib/utils';

const presetAmounts = [50, 100, 200, 500];
const SINGLE_LIMIT = 5000;

type PayStage = 'idle' | 'confirm' | 'paying' | 'paid';

export default function Recharge(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { account, recharge } = useApp();
  const [selectedAmount, setSelectedAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [stage, setStage] = useState<PayStage>('idle');
  const [orderNo, setOrderNo] = useState('');

  const finalAmount = useMemo(() => {
    if (!customAmount.trim()) return selectedAmount;
    const value = Number(customAmount);
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
  }, [customAmount, selectedAmount]);

  const validateAmount = (): boolean => {
    if (!finalAmount || finalAmount <= 0) {
      Toast.show({ content: '请输入有效充值金额', position: 'center' });
      return false;
    }
    if (finalAmount < 1) {
      Toast.show({ content: '单笔最低充值1元', position: 'center' });
      return false;
    }
    if (finalAmount > SINGLE_LIMIT) {
      Toast.show({ content: `单笔限额不超过¥${SINGLE_LIMIT}`, position: 'center' });
      return false;
    }
    if (!agreed) {
      Toast.show({ content: '请先阅读并同意充值协议', position: 'center' });
      return false;
    }
    return true;
  };

  const handleRecharge = (): void => {
    if (!validateAmount()) return;
    // 真实订单号由后台在创建微信订单时生成，确认框里不再展示本地假单号
    setOrderNo('');
    setStage('confirm');
    Dialog.confirm({
      title: '确认充值订单',
      content: (
        <div className="text-left text-sm space-y-2">
          <div className="flex justify-between"><span className="text-gray-500">充值金额</span><span className="font-semibold text-orange-600">¥{formatMoney(finalAmount)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">支付方式</span><span>微信支付</span></div>
          <div className="flex justify-between"><span className="text-gray-500">充值账户</span><span>本人一卡通</span></div>
          <div className="text-xs text-gray-400 pt-2">支付结果以微信回调为准。</div>
        </div>
      ),
      confirmText: '调起微信支付',
      cancelText: '再想想',
      onConfirm: () => {
        // 附加1：真实微信支付（JSAPI下单 → 调起支付 → 轮询查询兜底入账）
        setStage('paying');
        recharge(finalAmount).then((record) => {
          setOrderNo(record.orderNo);
          setStage('paid');
          Toast.show({ content: '支付成功，余额已更新', position: 'center' });
        }).catch((error) => {
          setStage('idle');
          Toast.show({ content: error instanceof Error ? error.message : '支付未完成', position: 'center' });
        });
      },
      onCancel: () => setStage('idle'),
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar onBack={() => setLocation('/')} className="bg-white">账户充值</NavBar>
      <div className="p-4 space-y-4">
        <Card className="!rounded-2xl !border !border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#0064E6] text-xl">
              <PayCircleOutlined />
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-500">当前余额</div>
              <div className="text-2xl font-bold text-gray-900 font-mono">¥{formatMoney(account.balance)}</div>
            </div>
            <Tag color="success" fill="outline">实时查询</Tag>
          </div>
          <div className="text-xs text-gray-400 mt-3">接口异常时将显示最近缓存值并标注更新时间：{account.updatedAt}</div>
        </Card>

        <Card className="!rounded-2xl !border !border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">选择充值金额</h2>
            <span className="text-xs text-gray-400">单笔 ¥1-¥5000</span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {presetAmounts.map((value) => (
              <button
                key={value}
                className={`h-12 rounded-xl border font-semibold transition-colors ${!customAmount && selectedAmount === value ? 'bg-[#0064E6] border-[#0064E6] text-white' : 'bg-white border-gray-200 text-gray-700'}`}
                onClick={() => {
                  setSelectedAmount(value);
                  setCustomAmount('');
                  setStage('idle');
                }}
              >
                ¥{value}
              </button>
            ))}
          </div>
          <div className="mt-5">
            <div className="text-sm text-gray-600 mb-2">自定义金额</div>
            <Input
              placeholder="请输入金额，最多两位小数"
              type="number"
              value={customAmount}
              onChange={(value) => {
                setCustomAmount(value);
                setStage('idle');
              }}
              className="!h-12 !bg-gray-50 !rounded-xl !px-4 !text-lg"
            />
          </div>
        </Card>

        <Card className="!rounded-2xl !border !border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 mb-4">支付方式</h2>
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-2xl border border-green-100">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">微</div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-800">微信支付</div>
              <div className="text-xs text-gray-500 mt-1">公众号 JSAPI 支付，支付结果以异步回调为准</div>
            </div>
            <div className="w-5 h-5 rounded-full border-2 border-green-500 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            </div>
          </div>
        </Card>

        {stage === 'paying' || stage === 'paid' ? (
          <Card className="!rounded-2xl !border !border-gray-100">
            <div className="flex items-center gap-3">
              {stage === 'paid'
                ? <CheckCircleOutlined className="text-3xl text-green-500" />
                : <ClockCircleOutlined className="text-3xl text-orange-500" />}
              <div>
                <div className="font-semibold text-gray-900">{stage === 'paid' ? '充值已到账' : '等待支付结果'}</div>
                <div className="text-xs text-gray-500 mt-1">订单号：{orderNo || '创建中…'}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-5 text-center text-xs">
              {['待支付', '支付成功', '已到账'].map((item, index) => (
                <div key={item} className={`rounded-full py-2 ${stage === 'paid' || index === 0 ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {item}
                </div>
              ))}
            </div>
            {stage === 'paid' && (
              <Button block fill="outline" className="mt-4" onClick={() => setLocation('/recharge-records')}>查看充值记录</Button>
            )}
          </Card>
        ) : null}

        <div className="flex items-start gap-2">
          <Checkbox checked={agreed} onChange={setAgreed} />
          <span className="text-xs text-gray-500 leading-5">
            我已阅读并同意
            <span
              className="text-[#0064E6]"
              onClick={(e) => { e.stopPropagation(); setLocation('/agreement?tab=agreement'); }}
            >《充值服务协议》</span>
            ，了解充值资金仅用于一脸通账户消费，默认不支持提现。
          </span>
        </div>

        <Button
          block
          color="primary"
          size="large"
          loading={stage === 'paying'}
          onClick={handleRecharge}
          className="!rounded-full !h-12"
          disabled={account.status !== 'normal'}
        >
          {stage === 'paying' ? '支付处理中' : `确认充值 ¥${formatMoney(finalAmount)}`}
        </Button>

        <div className="text-center text-xs text-gray-400 leading-5">
          <div className="flex items-center justify-center gap-1"><SafetyCertificateOutlined /> 单笔限额 ¥5000 · 单日限额 ¥20000</div>
          <div className="mt-1">支付成功后由微信异步通知入账；若长时间未到账，请稍后在充值记录中查看或联系管理员。</div>
        </div>
      </div>
    </div>
  );
}
