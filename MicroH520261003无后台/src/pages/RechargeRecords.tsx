import React, { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Empty, List, Modal, NavBar, NoticeBar, PullToRefresh, Tabs, Tag, Toast } from 'antd-mobile';
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, PayCircleOutlined } from '@ant-design/icons';
import TimeRangeFilter, { matchTimeRange, type TimeRange } from '../components/TimeRangeFilter';
import { useApp } from '../context/AppContext';
import type { RechargeRecord } from '../data/mock';
import { formatMoney } from '../lib/utils';

const statusMap = {
  paid: { text: '已到账', color: 'success', icon: <CheckCircleOutlined /> },
  pending: { text: '支付成功待入账', color: 'warning', icon: <ClockCircleOutlined /> },
  refunded: { text: '已退款', color: 'danger', icon: <CloseCircleOutlined /> },
  closed: { text: '已关闭', color: 'default', icon: <CloseCircleOutlined /> },
} as const;

export default function RechargeRecords(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { rechargeRecords } = useApp();
  const [range, setRange] = useState<TimeRange>('30d');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [status, setStatus] = useState('all');
  const [visibleCount, setVisibleCount] = useState(4);
  const [selected, setSelected] = useState<RechargeRecord | null>(null);

  const filtered = useMemo(() => rechargeRecords
    .filter((item) => status === 'all' || item.status === status)
    .filter((item) => matchTimeRange(item.time, range, start, end))
    .sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending') || b.time.localeCompare(a.time)),
  [end, range, rechargeRecords, start, status]);
  const visible = filtered.slice(0, visibleCount);
  const pendingCount = rechargeRecords.filter((item) => item.status === 'pending').length;
  const totalPaid = rechargeRecords.filter((item) => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0);

  const refresh = async (): Promise<void> => {
    await new Promise((resolve) => window.setTimeout(resolve, 600));
    setVisibleCount(4);
    Toast.show({ content: '充值记录已刷新', position: 'center' });
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar onBack={() => setLocation('/')} className="bg-white">充值记录</NavBar>
      <TimeRangeFilter range={range} start={start} end={end} onRangeChange={setRange} onStartChange={setStart} onEndChange={setEnd} />
      <Tabs activeKey={status} onChange={setStatus} className="bg-white">
        <Tabs.Tab title="全部" key="all" />
        <Tabs.Tab title="已到账" key="paid" />
        <Tabs.Tab title="待入账" key="pending" />
        <Tabs.Tab title="已退款" key="refunded" />
      </Tabs>

      <div className="p-4 space-y-4">
        <Card className="!rounded-2xl !border !border-gray-100">
          <div className="grid grid-cols-3 text-center">
            <div><div className="text-2xl font-bold font-mono text-gray-900">{formatMoney(totalPaid)}</div><div className="text-xs text-gray-500 mt-1">累计到账</div></div>
            <div className="border-x border-gray-100"><div className="text-2xl font-bold text-green-600">{rechargeRecords.length}</div><div className="text-xs text-gray-500 mt-1">充值笔数</div></div>
            <div><div className="text-2xl font-bold text-orange-500">{pendingCount}</div><div className="text-xs text-gray-500 mt-1">待入账</div></div>
          </div>
        </Card>
        {pendingCount > 0 && <NoticeBar color="alert" content={`有 ${pendingCount} 笔支付成功待入账，系统将自动重试；超时未到账自动退款。`} />}
      </div>

      <PullToRefresh onRefresh={refresh}>
        <div className="px-4 pb-6">
          {visible.length > 0 ? (
            <List className="!rounded-2xl overflow-hidden">
              {visible.map((record) => {
                const meta = statusMap[record.status];
                return (
                  <List.Item
                    key={record.id}
                    prefix={<div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${record.status === 'paid' ? 'bg-green-50 text-green-600' : record.status === 'pending' ? 'bg-orange-50 text-orange-500' : 'bg-red-50 text-red-500'}`}>{meta.icon}</div>}
                    arrow
                    onClick={() => setSelected(record)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-900">+{formatMoney(record.amount)}</div>
                        <div className="text-xs text-gray-400 mt-1">{record.channel} · {record.time}</div>
                        <div className="text-xs text-gray-400 mt-1">订单号：{record.orderNo}</div>
                      </div>
                      <Tag color={meta.color} fill="outline">{meta.text}</Tag>
                    </div>
                  </List.Item>
                );
              })}
            </List>
          ) : (
            <Empty image={<PayCircleOutlined className="text-6xl text-gray-300" />} description="暂无充值记录" className="mt-20" />
          )}
          {visibleCount < filtered.length && (
            <Button block fill="outline" className="mt-4" onClick={() => setVisibleCount((count) => count + 4)}>加载更多</Button>
          )}
        </div>
      </PullToRefresh>

      <Modal
        visible={selected !== null}
        title="充值订单详情"
        content={selected && (
          <div className="text-left text-sm space-y-3">
            <div className="flex justify-between"><span className="text-gray-500">充值金额</span><span className="font-mono">¥{formatMoney(selected.amount)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">订单状态</span><span>{statusMap[selected.status].text}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">商户单号</span><span className="text-xs">{selected.merchantNo}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">充值时间</span><span>{selected.time}</span></div>
            <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500">处理进度：{selected.progress}</div>
          </div>
        )}
        closeOnAction
        actions={[{ key: 'close', text: '关闭' }]}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
