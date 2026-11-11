import React, { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Empty, List, Modal, NavBar, PullToRefresh, Tabs, Tag, TextArea, Toast } from 'antd-mobile';
import { CoffeeOutlined, CreditCardOutlined, FileSearchOutlined, ShoppingOutlined } from '@ant-design/icons';
import TimeRangeFilter, { matchTimeRange, type TimeRange } from '../components/TimeRangeFilter';
import { initialConsumptionRecords, type ConsumptionRecord } from '../data/mock';
import { formatMoney } from '../lib/utils';

const typeTabs = [
  { key: 'all', title: '全部' },
  { key: 'consumption', title: '消费' },
  { key: 'order', title: '订餐扣款' },
  { key: 'refund', title: '退款' },
];

const iconMap = {
  consumption: <CoffeeOutlined />,
  order: <CoffeeOutlined />,
  refund: <CreditCardOutlined />,
};

export default function ConsumptionRecords(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const [records, setRecords] = useState<ConsumptionRecord[]>(initialConsumptionRecords);
  const [type, setType] = useState('all');
  const [range, setRange] = useState<TimeRange>('30d');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [visibleCount, setVisibleCount] = useState(4);
  const [selected, setSelected] = useState<ConsumptionRecord | null>(null);
  const [appealing, setAppealing] = useState<ConsumptionRecord | null>(null);
  const [appealReason, setAppealReason] = useState('');

  const filtered = useMemo(() => records
    .filter((item) => type === 'all' || item.type === type)
    .filter((item) => matchTimeRange(item.time, range, start, end)), [end, range, records, start, type]);
  const visible = filtered.slice(0, visibleCount);

  const refresh = async (): Promise<void> => {
    await new Promise((resolve) => window.setTimeout(resolve, 600));
    setVisibleCount(4);
    Toast.show({ content: '记录已刷新', position: 'center' });
  };

  const submitAppeal = (): void => {
    if (!appealing) return;
    if (appealReason.trim().length < 5) {
      Toast.show({ content: '请至少填写5个字说明异常原因', position: 'center' });
      return;
    }
    setRecords((list) => list.map((item) => item.id === appealing.id ? { ...item, status: 'appealing' } : item));
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
          {visible.length > 0 ? (
            <List className="!rounded-2xl overflow-hidden">
              {visible.map((record) => (
                <List.Item
                  key={record.id}
                  prefix={
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${record.amount > 0 ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                      {iconMap[record.type] || <ShoppingOutlined />}
                    </div>
                  }
                  arrow={<FileSearchOutlined className="text-gray-300" />}
                  onClick={() => setSelected(record)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-900">{record.title}</div>
                      <div className="text-xs text-gray-400 mt-1">{record.location}</div>
                      <div className="text-xs text-gray-400 mt-1">{record.time}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`font-bold font-mono ${record.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {record.amount > 0 ? '+' : ''}{formatMoney(record.amount)}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">余额 {formatMoney(record.balanceAfter)}</div>
                      {record.status === 'appealing' && <Tag color="warning" className="!mt-2">申诉中</Tag>}
                    </div>
                  </div>
                </List.Item>
              ))}
            </List>
          ) : (
            <Empty image={<CreditCardOutlined className="text-6xl text-gray-300" />} description="暂无消费记录" className="mt-20" />
          )}
          {visibleCount < filtered.length && (
            <Button block fill="outline" className="mt-4" onClick={() => setVisibleCount((count) => count + 4)}>加载更多</Button>
          )}
        </div>
      </PullToRefresh>

      <Modal
        visible={selected !== null}
        title="交易详情"
        content={selected && (
          <div className="text-left text-sm space-y-3">
            <div className="flex justify-between"><span className="text-gray-500">交易类型</span><span>{selected.title}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">交易金额</span><span className="font-mono">{formatMoney(selected.amount)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">交易后余额</span><span className="font-mono">{formatMoney(selected.balanceAfter)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">订单号</span><span className="text-xs">{selected.orderNo}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">终端编号</span><span className="text-xs">{selected.terminalNo}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">交易时间</span><span>{selected.time}</span></div>
          </div>
        )}
        closeOnAction
        actions={[
          ...(selected && selected.amount < 0 && selected.status !== 'appealing'
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
