import React, { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, NavBar, Segmented, Tag } from 'antd-mobile';
import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';

type DayStatus = 'normal' | 'late' | 'early' | 'absent' | 'leave' | 'rest' | 'future';

const statusMap: Record<DayStatus, { color: string; text: string }> = {
  normal: { color: 'bg-green-50 text-green-700 border-green-100', text: '正常' },
  late: { color: 'bg-orange-50 text-orange-700 border-orange-100', text: '迟到' },
  early: { color: 'bg-yellow-50 text-yellow-700 border-yellow-100', text: '早退' },
  absent: { color: 'bg-red-50 text-red-600 border-red-100', text: '缺卡' },
  leave: { color: 'bg-blue-50 text-blue-700 border-blue-100', text: '请假' },
  rest: { color: 'bg-gray-50 text-gray-400 border-gray-100', text: '休息' },
  future: { color: 'bg-white text-gray-300 border-gray-50', text: '' },
};

const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

function getStatus(date: Dayjs): DayStatus {
  const today = dayjs();
  if (date.isAfter(today, 'day')) return 'future';
  if (date.day() === 0 || date.day() === 6) return 'rest';
  if ([5, 12, 19].includes(date.date())) return 'late';
  if ([8, 15].includes(date.date())) return 'leave';
  if ([9].includes(date.date())) return 'absent';
  if ([21].includes(date.date())) return 'early';
  return 'normal';
}

export default function Attendance(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const [view, setView] = useState<'month' | 'day'>('month');
  const [month, setMonth] = useState(dayjs().startOf('month'));
  const [selectedDate, setSelectedDate] = useState(dayjs());

  const days = useMemo(() => {
    const first = month.startOf('month');
    const count = month.daysInMonth();
    const blanks = Array.from({ length: first.day() }, () => null as Dayjs | null);
    return blanks.concat(Array.from({ length: count }, (_, index) => first.add(index, 'day')));
  }, [month]);

  const selectedStatus = getStatus(selectedDate);
  const selectedDetail = {
    shift: '标准班次 09:00-18:00',
    checkIn: selectedStatus === 'normal' || selectedStatus === 'late' ? '08:53' : selectedStatus === 'early' ? '08:40' : '--',
    checkOut: selectedStatus === 'normal' ? '18:05' : selectedStatus === 'early' ? '17:20' : '--',
    device: selectedStatus === 'normal' || selectedStatus === 'late' || selectedStatus === 'early' ? '办公楼人脸机 01' : '--',
    exception: selectedStatus === 'late' ? '迟到 12 分钟，可发起申诉' : selectedStatus === 'absent' ? '缺少下班打卡，可申请补签' : selectedStatus === 'leave' ? '已批准请假' : '无异常',
  };

  const stats = [
    { label: '应出勤', value: 22, color: 'text-gray-900' },
    { label: '实出勤', value: 18, color: 'text-gray-900' },
    { label: '迟到', value: 2, color: 'text-orange-600' },
    { label: '早退', value: 1, color: 'text-yellow-600' },
    { label: '缺卡', value: 1, color: 'text-red-500' },
    { label: '请假', value: 2, color: 'text-blue-600' },
    { label: '加班(小时)', value: 6.5, color: 'text-purple-600' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar
        onBack={() => setLocation('/')}
        className="bg-white"
        right={<Button size="small" color="primary" onClick={() => setLocation('/attendance-apply')}>补签/请假</Button>}
      >
        我的考勤
      </NavBar>

      <div className="bg-white px-4 py-3 border-b border-gray-100">
        <Segmented
          options={[{ label: '月视图', value: 'month' }, { label: '日视图', value: 'day' }]}
          value={view}
          onChange={(value) => setView(value as 'month' | 'day')}
        />
      </div>

      <div className="p-4 space-y-4">
        <Card className="!rounded-2xl !border !border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center" onClick={() => setMonth((value) => value.subtract(1, 'month'))}><LeftOutlined /></button>
            <div className="font-semibold text-gray-900">{month.format('YYYY年MM月')}</div>
            <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center" onClick={() => setMonth((value) => value.add(1, 'month'))}><RightOutlined /></button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => <div key={day} className="text-center text-xs text-gray-400 py-2">{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, index) => {
              if (!date) return <div key={`blank-${index}`} className="aspect-square" />;
              const status = getStatus(date);
              const selected = date.isSame(selectedDate, 'day');
              return (
                <button
                  key={date.format('YYYY-MM-DD')}
                  className={`aspect-square rounded-xl border flex flex-col items-center justify-center ${statusMap[status].color} ${selected ? 'ring-2 ring-[#0064E6]' : ''}`}
                  onClick={() => {
                    setSelectedDate(date);
                    setView('day');
                  }}
                >
                  <span className="font-semibold">{date.date()}</span>
                  {statusMap[status].text && <span className="text-[10px] mt-1">{statusMap[status].text}</span>}
                </button>
              );
            })}
          </div>
        </Card>

        {view === 'month' && (
          <Card className="!rounded-2xl !border !border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">本月统计</h2>
            <div className="grid grid-cols-4 gap-3">
              {stats.map((item) => (
                <div key={item.label} className="rounded-2xl bg-gray-50 p-3 text-center">
                  <div className={`text-xl font-bold font-mono ${item.color}`}>{item.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{item.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs text-gray-400">统计数据来源于考勤子系统，H5端只读展示。</div>
          </Card>
        )}

        {view === 'day' && (
          <Card className="!rounded-2xl !border !border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900">{selectedDate.format('YYYY年MM月DD日')} 考勤明细</h2>
                <p className="text-xs text-gray-400 mt-1">{selectedDetail.shift}</p>
              </div>
              <Tag color={selectedStatus === 'normal' ? 'success' : selectedStatus === 'rest' ? 'default' : selectedStatus === 'future' ? 'default' : 'warning'}>
                {statusMap[selectedStatus].text || '未到期'}
              </Tag>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-3">
                <div className="flex items-center gap-3"><CheckCircleOutlined className={selectedDetail.checkIn === '--' ? 'text-gray-300' : 'text-green-500'} /><span>上班打卡</span></div>
                <span className="font-mono">{selectedDetail.checkIn}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-3">
                <div className="flex items-center gap-3"><ClockCircleOutlined className={selectedDetail.checkOut === '--' ? 'text-gray-300' : 'text-green-500'} /><span>下班打卡</span></div>
                <span className="font-mono">{selectedDetail.checkOut}</span>
              </div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">打卡设备</span><span>{selectedDetail.device}</span></div>
              <div className="rounded-xl bg-orange-50 p-3 text-xs text-orange-700">{selectedDetail.exception}</div>
            </div>
            {(selectedStatus === 'late' || selectedStatus === 'absent' || selectedStatus === 'early') && (
              <Button block color="primary" fill="outline" className="mt-4" onClick={() => setLocation('/attendance-apply')}>发起补签/申诉</Button>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
