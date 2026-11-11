import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Empty, NavBar, PullToRefresh, Tag, Toast } from 'antd-mobile';
import { CheckCircleOutlined, CloseCircleOutlined, GatewayOutlined } from '@ant-design/icons';
import TimeRangeFilter, { type TimeRange } from '../components/TimeRangeFilter';
import { m } from '../lib/api';

interface AccessRecord {
  id: string;
  time: string;
  door: string;
  /** 门的唯一标识 Ctrl_No-Door_No，按门筛选用它，避免不同控制器下同名门串数据 */
  doorKey: string;
  direction: string;
  method: string;
  result: 'success' | 'failed';
  reason: string;
}

/** 门筛选项（来自 MJ_Door） */
interface DoorOption {
  key: string;
  label: string;
}

const ALL = '全部';

/**
 * 门的展示名：
 * MJ_Door.Door_Name 里常见纯编号（如 205、210），单独看毫无意义，
 * 这类补上 MJ_Controller.Ctrl_Name 作为限定；已有中文名（音控室、门1）则原样显示，避免标签过长。
 */
function doorLabel(doorName: string, ctrlName: string): string {
  const name = (doorName || '').trim();
  const ctrl = (ctrlName || '').trim();
  if (!name) return ctrl || '未知门';
  if (ctrl && ctrl !== name && /^\d+$/.test(name)) return `${ctrl}·${name}`;
  return name;
}

const pad = (n: number): string => String(n).padStart(2, '0');
const fmtDate = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** 快捷区间 → 服务端查询的起止日期（闭区间，含起止当天） */
function rangeBounds(range: TimeRange, start: string, end: string): { bgn: string; end: string } {
  const now = new Date();
  if (range === 'today') return { bgn: fmtDate(now), end: fmtDate(now) };
  if (range === '7d') return { bgn: fmtDate(new Date(now.getTime() - 6 * 864e5)), end: fmtDate(now) };
  if (range === '30d') return { bgn: fmtDate(new Date(now.getTime() - 29 * 864e5)), end: fmtDate(now) };
  return { bgn: start || fmtDate(new Date(now.getTime() - 29 * 864e5)), end: end || fmtDate(now) };
}

const fmtTime = (v: string): string => (v || '').replace('T', ' ').substring(0, 16);

// 附加8：正常/异常通行记录取后台（通行方式与异常原因由后端关联 MJ_EventInfo，
// 门名缺省时由后端按 MJ_Door 补全），门筛选项取后台 MJ_Door，不再前端硬编码门名。
export default function AccessRecords(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const [range, setRange] = useState<TimeRange>('7d');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [door, setDoor] = useState(ALL);
  const [visibleCount, setVisibleCount] = useState(5);
  const [records, setRecords] = useState<AccessRecord[]>([]);
  const [doors, setDoors] = useState<DoorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDoors = useCallback(async (): Promise<void> => {
    try {
      const rows = await m.accessDoors();
      const list: DoorOption[] = (Array.isArray(rows) ? rows : [])
        .map((r: any) => ({
          key: `${r.ctrlNo || ''}-${r.doorNo ?? ''}`,
          label: doorLabel(String(r.doorName || ''), String(r.ctrlName || '')),
        }))
        .filter((x: DoorOption) => !!x.label);
      // 同名门合并成一个筛选项（不同控制器下的同名门很少，合并后按名称匹配仍然可用）
      const seen = new Set<string>();
      setDoors(list.filter((x) => (seen.has(x.label) ? false : (seen.add(x.label), true))));
    } catch {
      setDoors([]); // 门列表拉不到就只留「全部」，不影响记录展示
    }
  }, []);

  const load = useCallback(async (): Promise<void> => {
    const b = rangeBounds(range, start, end);
    if (b.bgn > b.end) { Toast.show({ content: '开始日期不能晚于结束日期' }); return; }
    setLoading(true);
    try {
      const [n, a] = await Promise.all([m.accessNormal(b.bgn, b.end), m.accessAbnorm(b.bgn, b.end)]);
      const normal: AccessRecord[] = (Array.isArray(n) ? n : []).map((r: any) => ({
        id: 'N' + r.id,
        time: fmtTime(r.time),
        door: r.door || '',
        doorKey: `${r.ctrlNo || ''}-${r.doorNo ?? ''}`,
        direction: r.direction || '',
        method: r.passType || '刷卡',
        result: 'success',
        reason: '',
      }));
      const abnorm: AccessRecord[] = (Array.isArray(a) ? a : []).map((r: any) => ({
        id: 'A' + r.id,
        time: fmtTime(r.time),
        door: r.door || '',
        doorKey: `${r.ctrlNo || ''}-${r.doorNo ?? ''}`,
        direction: r.direction || '',
        method: '',
        result: 'failed',
        reason: r.reason || '',
      }));
      setRecords([...normal, ...abnorm].sort((x, y) => (x.time < y.time ? 1 : -1)));
      setError('');
    } catch {
      setRecords([]);
      setError('通行记录加载失败');
    } finally {
      setLoading(false);
    }
  }, [range, start, end]);

  useEffect(() => { loadDoors(); }, [loadDoors]);
  useEffect(() => { load(); }, [load]);

  // 服务端已按区间过滤，这里只做门筛选（不再二次按时间过滤，避免两套口径打架）
  const filtered = useMemo(
    () => records.filter((r) => door === ALL || r.doorKey === door),
    [records, door],
  );
  const visible = filtered.slice(0, visibleCount);
  // 记录里的门名用 MJ_Door 的展示名（纯编号会补上控制器名），门已被删掉的回退用记录自带的名称
  const doorLabels = useMemo(() => new Map(doors.map((d) => [d.key, d.label])), [doors]);

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar onBack={() => setLocation('/pass-code')} className="bg-white">门禁通行记录</NavBar>
      <TimeRangeFilter range={range} start={start} end={end} onRangeChange={setRange} onStartChange={setStart} onEndChange={setEnd} />

      <div className="bg-white px-4 py-3 flex flex-nowrap items-center gap-2 overflow-x-auto">
        {[{ key: ALL, label: ALL }, ...doors].map((item) => (
          <Button
            key={item.key}
            size="mini"
            className={`!flex-none !whitespace-nowrap !rounded-full !px-3 ${door === item.key ? '!bg-[#0064E6] !text-white !border-[#0064E6]' : '!bg-gray-100 !border-0 !text-gray-600'}`}
            onClick={() => { setDoor(item.key); setVisibleCount(5); }}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <PullToRefresh onRefresh={async () => { await load(); setVisibleCount(5); }}>
        <div className="p-4 pb-6">
          {loading ? (
            <div className="text-center text-sm text-gray-400 mt-20">加载中…</div>
          ) : visible.length > 0 ? (
            <div className="space-y-3">
              {visible.map((record) => {
                const ok = record.result === 'success';
                return (
                  <Card key={record.id} className="!rounded-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${ok ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                          {ok ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{doorLabels.get(record.doorKey) || record.door}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {record.time}
                            {record.direction ? ` · ${record.direction}` : ''}
                            {record.method ? ` · ${record.method}` : ''}
                          </div>
                        </div>
                      </div>
                      <Tag color={ok ? 'success' : 'danger'} fill="outline">{ok ? '通行成功' : '通行失败'}</Tag>
                    </div>
                    {record.reason && <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500">原因：{record.reason}</div>}
                  </Card>
                );
              })}
            </div>
          ) : (
            <Empty
              image={<GatewayOutlined className="text-6xl text-gray-300" />}
              description={error || '所选时间暂无通行记录'}
              className="mt-20"
            />
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
