import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Empty, List, Modal, NavBar, NoticeBar, PullToRefresh, Tabs, Tag, Toast } from 'antd-mobile';
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, PayCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import TimeRangeFilter, { type TimeRange } from '../components/TimeRangeFilter';
import { m } from '../lib/api';
import type { RechargeRecord } from '../data/mock';
import { formatMoney } from '../lib/utils';

const statusMap = {
  paid: { text: '已到账', color: 'success', icon: <CheckCircleOutlined /> },
  pending: { text: '支付成功待入账', color: 'warning', icon: <ClockCircleOutlined /> },
  refunded: { text: '已退款', color: 'danger', icon: <CloseCircleOutlined /> },
  closed: { text: '已关闭', color: 'default', icon: <CloseCircleOutlined /> },
} as const;

// 时间范围 → 后端查询区间（与 ST_SupplyFund.Supply_Date 对齐，逻辑同消费记录）
function rangeBounds(range: TimeRange, start: string, end: string): { bgn: string; end: string } {
  const now = dayjs();
  if (range === 'today') {
    return { bgn: now.format('YYYY-MM-DD'), end: now.format('YYYY-MM-DD') };
  }
  if (range === '7d') {
    return { bgn: now.subtract(7, 'day').format('YYYY-MM-DD'), end: now.format('YYYY-MM-DD') };
  }
  if (range === '30d') {
    return { bgn: now.subtract(30, 'day').format('YYYY-MM-DD'), end: now.format('YYYY-MM-DD') };
  }
  return { bgn: start || now.subtract(30, 'day').format('YYYY-MM-DD'), end: end || now.format('YYYY-MM-DD') };
}

function mapRecord(r: any): RechargeRecord {
  return {
    id: String(r.id),
    amount: Number(r.amount || 0),
    // 渠道由后台按 Out_Trade_No 判定：非空=微信充值，空=刷卡充值
    channel: r.channel || '其他充值',
    status: 'paid' as const,
    time: (r.time || '').replace('T', ' ').substring(0, 16),
    orderNo: r.outTradeNo || '-',
    merchantNo: r.outTradeNo || '',
    progress: r.remark || '支付成功，平台已入账',
    // Card_Balance 为充值前余额，balance 为充值后余额（前+金额）
    beforeFund: Number(r.beforeFund || 0),
    balance: Number(r.balance || 0),
  };
}

export default function RechargeRecords(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const [records, setRecords] = useState<RechargeRecord[]>([]);
  const [range, setRange] = useState<TimeRange>('30d');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [status, setStatus] = useState('all');
  const [visibleCount, setVisibleCount] = useState(4);
  // loading：请求中；error：请求失败（可重试）；两者皆 false 且无数据即"无记录"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<RechargeRecord | null>(null);

  const load = useCallback(async (): Promise<boolean> => {
    const { bgn, end: to } = rangeBounds(range, start, end);
    setLoading(true);
    setError('');
    try {
      const rows = await m.rechargeRecords(bgn, to);
      // 仅以后台数据为准；拉不到就展示空状态，不使用演示数据
      setRecords(Array.isArray(rows) ? rows.map(mapRecord) : []);
      return true;
    } catch {
      // 请求失败：清空列表并进入可重试的错误态
      setRecords([]);
      setError('充值记录加载失败，请检查网络后重试');
      return false;
    } finally {
      setLoading(false);
    }
  }, [end, range, start]);

  useEffect(() => {
    setVisibleCount(4);
    load();
  }, [load]);

  // 时间区间已在服务端过滤，此处只按状态筛选
  const filtered = useMemo(() => records
    .filter((item) => status === 'all' || item.status === status)
    .sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending') || b.time.localeCompare(a.time)),
  [records, status]);
  const visible = filtered.slice(0, visibleCount);
  const pendingCount = records.filter((item) => item.status === 'pending').length;
  const totalPaid = records.filter((item) => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0);

  const refresh = async (): Promise<void> => {
    setVisibleCount(4);
    await load();
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
            <div className="border-x border-gray-100"><div className="text-2xl font-bold text-green-600">{records.length}</div><div className="text-xs text-gray-500 mt-1">充值笔数</div></div>
            <div><div className="text-2xl font-bold text-orange-500">{pendingCount}</div><div className="text-xs text-gray-500 mt-1">待入账</div></div>
          </div>
        </Card>
        {pendingCount > 0 && <NoticeBar color="alert" content={`有 ${pendingCount} 笔支付成功待入账，系统将自动重试；超时未到账自动退款。`} />}
      </div>

      <PullToRefresh onRefresh={refresh}>
        <div className="px-4 pb-6">
          {loading ? (
            <div className="text-center text-gray-400 py-20">正在加载充值记录…</div>
          ) : error ? (
            <div className="text-center py-20">
              <PayCircleOutlined className="text-5xl text-gray-300" />
              <div className="text-gray-500 mt-3">{error}</div>
              <Button color="primary" className="mt-4" onClick={() => { load(); }}>重新加载</Button>
            </div>
          ) : visible.length > 0 ? (
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
            <Empty image={<PayCircleOutlined className="text-6xl text-gray-300" />} description="所选时间暂无充值记录" className="mt-20" />
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
            <div className="flex justify-between"><span className="text-gray-500">充值渠道</span><span>{selected.channel}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">订单状态</span><span>{statusMap[selected.status].text}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">充值前余额</span><span className="font-mono">{formatMoney(selected.beforeFund)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">充值后余额</span><span className="font-mono">{formatMoney(selected.balance)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">商户单号</span><span className="text-xs break-all text-right">{selected.merchantNo || '-'}</span></div>
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
