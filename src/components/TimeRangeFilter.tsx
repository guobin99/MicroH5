import React from 'react';
import { Toast } from 'antd-mobile';
import dayjs from 'dayjs';

export type TimeRange = 'today' | '7d' | '30d' | 'custom' | 'future' | 'next7d';

interface Props {
  range: TimeRange;
  start: string;
  end: string;
  onRangeChange: (range: TimeRange) => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  /** 可选：自定义快捷选项（不传则用默认的 今天/近7天/近30天/自定义） */
  options?: { value: TimeRange; label: string }[];
}

const defaultOptions: { value: TimeRange; label: string }[] = [
  { value: 'today', label: '今天' },
  { value: '7d', label: '近7天' },
  { value: '30d', label: '近30天' },
  { value: 'custom', label: '自定义' },
];

export function matchTimeRange(time: string, range: TimeRange, start: string, end: string): boolean {
  const target = dayjs(time);
  if (!target.isValid()) return false;
  const now = dayjs();
  if (range === 'today') return target.isSame(now, 'day');
  if (range === '7d') return target.isAfter(now.subtract(7, 'day'));
  if (range === '30d') return target.isAfter(now.subtract(30, 'day'));
  // 今天起（不限上限）
  if (range === 'future') return !target.isBefore(now.startOf('day'));
  // 未来 7 天
  if (range === 'next7d') return !target.isBefore(now.startOf('day')) && !target.isAfter(now.add(7, 'day').endOf('day'));
  if (!start || !end) return true;
  const startDate = dayjs(start).startOf('day');
  const endDate = dayjs(end).endOf('day');
  return !target.isBefore(startDate) && !target.isAfter(endDate);
}

export default function TimeRangeFilter({ range, start, end, onRangeChange, onStartChange, onEndChange, options }: Props): React.JSX.Element {
  const list = options && options.length ? options : defaultOptions;
  const changeRange = (value: TimeRange): void => {
    if (value === 'custom' && start && end && dayjs(end).diff(dayjs(start), 'day') > 92) {
      Toast.show({ content: '自定义查询跨度不能超过3个月', position: 'center' });
      return;
    }
    onRangeChange(value);
  };

  const changeDate = (type: 'start' | 'end', value: string): void => {
    const nextStart = type === 'start' ? value : start;
    const nextEnd = type === 'end' ? value : end;
    if (nextStart && nextEnd && dayjs(nextEnd).diff(dayjs(nextStart), 'day') > 92) {
      Toast.show({ content: '自定义查询跨度不能超过3个月', position: 'center' });
      return;
    }
    if (type === 'start') onStartChange(value);
    else onEndChange(value);
  };

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3">
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${list.length}, minmax(0, 1fr))` }}
      >
        {list.map((item) => (
          <button
            key={item.value}
            className={`h-9 rounded-full text-sm ${range === item.value ? 'bg-[#0064E6] text-white font-semibold' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => changeRange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {range === 'custom' && (
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center mt-3">
          <input
            type="date"
            className="h-10 rounded-xl bg-gray-50 px-3 text-sm outline-none"
            value={start}
            onChange={(event) => changeDate('start', event.target.value)}
          />
          <span className="text-gray-400">至</span>
          <input
            type="date"
            className="h-10 rounded-xl bg-gray-50 px-3 text-sm outline-none"
            value={end}
            onChange={(event) => changeDate('end', event.target.value)}
          />
        </div>
      )}
    </div>
  );
}
