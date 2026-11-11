import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Empty, List, Modal, NavBar, PullToRefresh, Tabs, Tag, TextArea, Toast } from 'antd-mobile';
import { CreditCardOutlined, ExclamationCircleOutlined, FileSearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import TimeRangeFilter, { type TimeRange } from '../components/TimeRangeFilter';
import type { ConsumptionRecord } from '../data/mock';
import { m } from '../lib/api';
import { formatMoney } from '../lib/utils';

// 消费记录报表只展示 XF_Consume 消费流水；订餐记录见「我的订餐」页面
const typeTabs = [
  { key: 'all', title: '全部' },
  { key: 'consumption', title: '消费' },
  { key: 'refund', title: '退款' },
];

// 时间范围 → 后端查询区间（与 XF_Consume.Consume_Time 对齐）
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

function mapRecord(r: any): ConsumptionRecord {
  const amount = Number(r.amount || 0);
  const time = (r.time || '').replace('T', ' ').substring(0, 19);
  return {
    id: String(r.id),
    // 消费金额 Consume_Fund：小于 0 为退款，大于等于 0 为消费
    type: amount < 0 ? 'refund' : 'consumption',
    title: (r.remark && String(r.remark).trim()) || (amount < 0 ? '退款' : '消费'),
    amount,
    balanceAfter: Number(r.balance || 0),
    time,
    consumeFund: amount,
    cardBalance: Number(r.balance || 0),
    repastName: r.repastName || r.repastNo || '',
    repastNo: r.repastNo || '',
    orderNo: r.orderNo || '',
    mocNo: r.mocNo || '',
    mocName: r.mocName || '',
    status: 'success',
  };
}

export default function ConsumptionRecords(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const [records, setRecords] = useState<ConsumptionRecord[]>([]);
  const [type, setType] = useState('all');
  const [range, setRange] = useState<TimeRange>('30d');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);
  // loading：请求中；error：请求失败（可重试）；两者皆 false 且无数据即"无记录"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<ConsumptionRecord | null>(null);
  const [appealing, setAppealing] = useState<ConsumptionRecord | null>(null);
  const [appealReason, setAppealReason] = useState('');

  const load = useCallback(async (): Promise<boolean> => {
    const { bgn, end: to } = rangeBounds(range, start, end);
    setLoading(true);
    setError('');
    try {
      const rows = await m.consumptions(bgn, to);
      // 仅以后台数据为准；拉不到就展示空状态，不使用演示数据
      setRecords(Array.isArray(rows) ? rows.map(mapRecord) : []);
      return true;
    } catch {
      // 请求失败：清空列表并进入可重试的错误态
      setRecords([]);
      setError('消费记录加载失败，请检查网络后重试');
      return false;
    } finally {
      setLoading(false);
    }
  }, [end, range, start]);

  useEffect(() => {
    setVisibleCount(10);
    load();
  }, [load]);

  const filtered = useMemo(() => records.filter((item) => type === 'all' || item.type === type), [records, type]);
  const visible = filtered.slice(0, visibleCount);

  const refresh = async (): Promise<void> => {
    setVisibleCount(10);
    const ok = await load();
    // 失败时错误态已给出提示与重试入口，此处不重复打扰
    if (ok) Toast.show({ content: '记录已刷新', position: 'center' });
  };

  const submitAppeal = (): void => {
    if (!appealing) return;
    if (appealReason.trim().length < 5) {
      Toast.show({ content: '请至少填写5个字说明异常原因', position: 'center' });
      return;
    }
    setRecords((list) => list.map((item) => (item.id === appealing.id ? { ...item, status: 'appealing' } : item)));
    setAppealing(null);
    setAppealReason('');
    Toast.show({ content: '申诉已提交，处理结果将推送', position: 'center' });
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar onBack={() => setLocation('/')} className="bg-white">消费记录</NavBar>
      <TimeRangeFilter range={range} start={start} end={end} onRangeChange={setRange} onStartChange={setStart} onEndChange={setEnd} />
      <Tabs activeKey={type} onChange={setType} className="bg-white">
        {typeTabs.map((item) => <Tabs.Tab title={item.title} key={item.key} />)}
      </Tabs>

      <PullToRefresh onRefresh={refresh}>
        <div className="p-4 pb-6">
          {loading ? (
            <div className="text-center text-gray-400 py-20">正在加载消费记录…</div>
          ) : error ? (
            <div className="text-center py-20">
              <ExclamationCircleOutlined className="text-5xl text-gray-300" />
              <div className="text-gray-500 mt-3">{error}</div>
              <Button color="primary" className="mt-4" onClick={() => { setRecords([]); load(); }}>重新加载</Button>
            </div>
          ) : visible.length > 0 ? (
            <>
              <List className="!rounded-2xl overflow-hidden">
                {visible.map((record) => (
                  <List.Item
                    key={record.id}
                    prefix={
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${record.amount < 0 ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                        <CreditCardOutlined />
                      </div>
                    }
                    arrow={<FileSearchOutlined className="text-gray-300" />}
                    onClick={() => setSelected(record)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900">{record.title}</div>
                        <div className="text-xs text-gray-400 mt-1 truncate">
                          {[record.repastName, record.mocName].filter(Boolean).join(' · ') || '—'}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{record.time}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`font-bold font-mono ${record.amount < 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {record.amount < 0 ? '+' : '-'}{formatMoney(Math.abs(record.amount))}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">余额 {formatMoney(record.balanceAfter)}</div>
                        {record.status === 'appealing' && <Tag color="warning" className="!mt-2">申诉中</Tag>}
                      </div>
                    </div>
                  </List.Item>
                ))}
              </List>
              {visibleCount < filtered.length && (
                <Button block fill="outline" className="mt-4" onClick={() => setVisibleCount((count) => count + 10)}>加载更多</Button>
              )}
            </>
          ) : (
            <Empty image={<CreditCardOutlined className="text-6xl text-gray-300" />} description="所选时间暂无消费记录" className="mt-20" />
          )}
        </div>
      </PullToRefresh>

      <Modal
        visible={selected !== null}
        title="消费详情"
        content={selected && (
          <div className="text-left text-sm space-y-3">
            <div className="flex justify-between"><span className="text-gray-500">消费类型</span><span>{selected.title}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">消费时间</span><span>{selected.time}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">餐别</span><span>{selected.repastName || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">消费金额</span><span className="font-mono">{formatMoney(selected.consumeFund)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">消费后余额</span><span className="font-mono">{formatMoney(selected.cardBalance)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">订单号</span><span className="text-xs break-all text-right">{selected.orderNo || '—'}</span></div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500 shrink-0">机器</span>
              <span className="text-xs text-right break-all">
                {selected.mocName || '—'}{selected.mocNo ? `（${selected.mocNo}）` : ''}
              </span>
            </div>
          </div>
        )}
        closeOnAction
        actions={[
          ...(selected && selected.amount >= 0 && selected.status !== 'appealing'
            ? [{ key: 'appeal', text: '异常申诉', danger: true, onClick: () => setAppealing(selected) }]
            : []),
          { key: 'close', text: '关闭' },
        ]}
        onClose={() => setSelected(null)}
      />

      <Modal
        visible={appealing !== null}
        title="异常扣款申诉"
        content={
          <TextArea
            placeholder="请说明异常原因，例如重复扣款、金额不符等"
            rows={4}
            maxLength={200}
            showCount
            value={appealReason}
            onChange={setAppealReason}
          />
        }
        actions={[
          { key: 'cancel', text: '取消', onClick: () => setAppealing(null) },
          { key: 'submit', text: '提交申诉', primary: true, onClick: submitAppeal },
        ]}
        onClose={() => setAppealing(null)}
      />
    </div>
  );
}