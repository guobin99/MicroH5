import React, { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Empty, List, NavBar, PullToRefresh, Tag, Toast } from 'antd-mobile';
import { CheckCircleOutlined, CloseCircleOutlined, GatewayOutlined, WarningOutlined } from '@ant-design/icons';
import TimeRangeFilter, { matchTimeRange, type TimeRange } from '../components/TimeRangeFilter';
import { initialAccessRecords } from '../data/mock';

const doorOptions = ['全部', '东门门禁', '办公楼大厅', '食堂入口', '档案室', '宿舍区西门'];

const resultMap = {
  success: { text: '通行成功', color: 'success', icon: <CheckCircleOutlined /> },
  denied: { text: '无权限', color: 'danger', icon: <CloseCircleOutlined /> },
  offline: { text: '设备离线', color: 'warning', icon: <WarningOutlined /> },
} as const;

export default function AccessRecords(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const [range, setRange] = useState<TimeRange>('7d');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [door, setDoor] = useState('全部');
  const [visibleCount, setVisibleCount] = useState(5);

  const filtered = useMemo(() => initialAccessRecords.filter((record) =>
    matchTimeRange(record.time, range, start, end) && (door === '全部' || record.door === door),
  ), [door, end, range, start]);
  const visible = filtered.slice(0, visibleCount);

  const refresh = async (): Promise<void> => {
    await new Promise((resolve) => window.setTimeout(resolve, 600));
    setVisibleCount(5);
    Toast.show({ content: '已刷新', position: 'center' });
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar onBack={() => setLocation('/pass-code')} className="bg-white">门禁通行记录</NavBar>
      <TimeRangeFilter range={range} start={start} end={end} onRangeChange={setRange} onStartChange={setStart} onEndChange={setEnd} />

      <div className="bg-white px-4 py-3 flex gap-2 overflow-x-auto">
        {doorOptions.map((item) => (
          <Button
            key={item}
            size="mini"
            className={door === item ? '!bg-[#0064E6] !text-white !border-[#0064E6]' : '!bg-gray-100 !border-0 !text-gray-600'}
            onClick={() => setDoor(item)}
          >
            {item}
          </Button>
        ))}
      </div>

      <PullToRefresh onRefresh={refresh}>
        <div className="p-4 pb-6">
          {visible.length > 0 ? (
            <div className="space-y-3">
              {visible.map((record) => {
                const meta = resultMap[record.result];
                return (
                  <Card key={record.id} className="!rounded-2xl !border !border-gray-100">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${record.result === 'success' ? 'bg-green-50 text-green-600' : record.result === 'denied' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
                          {meta.icon}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{record.door}</div>
                          <div className="text-xs text-gray-400 mt-1">{record.time} · {record.method}</div>
                        </div>
                      </div>
                      <Tag color={meta.color} fill="outline">{meta.text}</Tag>
                    </div>
                    {record.reason && <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500">原因：{record.reason}</div>}
                  </Card>
                );
              })}
            </div>
          ) : (
            <Empty image={<GatewayOutlined className="text-6xl text-gray-300" />} description="暂无通行记录" className="mt-20" />
          )}

          {visibleCount < filtered.length && (
            <Button block fill="outline" className="mt-4" onClick={() => setVisibleCount((value) => value + 5)}>
              加载更多
            </Button>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}
