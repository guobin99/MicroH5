import React, { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Dialog, Empty, Modal, NavBar, Tabs, Tag, Toast } from 'antd-mobile';
import { CoffeeOutlined, QrcodeOutlined } from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import dayjs from 'dayjs';
import { useApp } from '../context/AppContext';
import type { MealOrder } from '../data/mock';
import { formatMoney } from '../lib/utils';

const statusMap = {
  ordered: { color: 'primary', text: '已预订' },
  picked: { color: 'success', text: '已取餐' },
  refunded: { color: 'danger', text: '已退订' },
  expired: { color: 'default', text: '已过期' },
} as const;

export default function MyOrders(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { mealOrders, cancelMealOrder } = useApp();
  const [status, setStatus] = useState('all');
  const [qrOrder, setQrOrder] = useState<MealOrder | null>(null);

  const filtered = useMemo(() => mealOrders.filter((order) => status === 'all' || order.status === status), [mealOrders, status]);

  const canCancel = (order: MealOrder): boolean => order.status === 'ordered' && dayjs().isBefore(dayjs(order.deadline));

  const handleCancel = (order: MealOrder): void => {
    if (!canCancel(order)) {
      Toast.show({ content: '已超过退订截止时间，无法退订', position: 'center' });
      return;
    }
    Dialog.confirm({
      title: '确认退订',
      content: `退订后 ¥${formatMoney(order.amount)} 将原路退回一卡通余额。`,
      confirmText: '确认退订',
      cancelText: '取消',
      onConfirm: () => {
        cancelMealOrder(order.id);
        Toast.show({ content: '已退订，退款已退回余额', position: 'center' });
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar
        onBack={() => setLocation('/')}
        className="bg-white"
        right={<Button size="small" color="primary" onClick={() => setLocation('/menu')}>去订餐</Button>}
      >
        我的订餐
      </NavBar>
      <Tabs activeKey={status} onChange={setStatus} className="bg-white">
        <Tabs.Tab title="全部" key="all" />
        <Tabs.Tab title="已预订" key="ordered" />
        <Tabs.Tab title="已取餐" key="picked" />
        <Tabs.Tab title="已退订" key="refunded" />
        <Tabs.Tab title="已过期" key="expired" />
      </Tabs>

      <div className="p-4 space-y-3">
        {filtered.length > 0 ? filtered.map((order) => (
          <Card key={order.id} className="!rounded-2xl !border !border-gray-100">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center"><CoffeeOutlined /></div>
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900">{order.canteen} · {order.meal}</div>
                  <div className="text-xs text-gray-400 mt-1">{order.date} {order.pickupTime}</div>
                </div>
              </div>
              <Tag color={statusMap[order.status].color}>{statusMap[order.status].text}</Tag>
            </div>

            <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600 leading-6">
              {order.items.map((item) => <div key={item}>• {item}</div>)}
            </div>

            <div className="flex justify-between text-xs text-gray-400 mt-3">
              <span>退订截止 {order.deadline}</span>
              <span className="text-orange-600 text-sm font-bold font-mono">¥{formatMoney(order.amount)}</span>
            </div>

            {order.status === 'ordered' && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <Button size="small" fill="outline" className="flex-1" onClick={() => setQrOrder(order)}>
                  <QrcodeOutlined /> 取餐凭证
                </Button>
                <Button size="small" fill="outline" color={canCancel(order) ? 'danger' : 'default'} className="flex-1" onClick={() => handleCancel(order)}>
                  退订
                </Button>
              </div>
            )}
            {order.status === 'refunded' && <div className="mt-3 text-xs text-green-600">退款已原路退回一卡通余额</div>}
          </Card>
        )) : (
          <div className="mt-20">
            <Empty image={<CoffeeOutlined className="text-6xl text-gray-300" />} description="暂无订餐订单" />
            <div className="text-center mt-4"><Button color="primary" onClick={() => setLocation('/menu')}>去订餐</Button></div>
          </div>
        )}
      </div>

      <Modal
        visible={qrOrder !== null}
        title="取餐凭证"
        content={qrOrder && (
          <div className="text-center">
            <div className="inline-block p-4 bg-white rounded-2xl border border-gray-100 shadow-inner">
              <QRCodeSVG value={`${qrOrder.orderNo}|${qrOrder.pickupCode}`} size={180} level="H" />
            </div>
            <div className="text-2xl font-bold font-mono mt-4">{qrOrder.pickupCode}</div>
            <div className="text-xs text-gray-500 mt-2">{qrOrder.date} {qrOrder.pickupTime} · {qrOrder.canteen}</div>
            <div className="text-xs text-gray-400 mt-1">取餐时由食堂终端扫码核销</div>
          </div>
        )}
        closeOnAction
        actions={[{ key: 'close', text: '关闭' }]}
        onClose={() => setQrOrder(null)}
      />
    </div>
  );
}
