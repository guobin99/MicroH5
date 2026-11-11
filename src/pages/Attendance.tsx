import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, NavBar, Segmented, Tag, Toast } from 'antd-mobile';
import { CheckCircleOutlined, ClockCircleOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { m } from '../lib/api';

type DayStatus = 'normal' | 'late' | 'early' | 'absent' | 'leave' | 'rest' | 'future';

/** 后端 /m/attendance/daily 的单日行（KQ_Daily / KQ_DailyHistory 投影） */
type AttendanceRow = {
  date: string;
  week?: string;
  classNo?: string;
  className?: string;
  in1?: string; out1?: string;
  in2?: string; out2?: string;
  in3?: string; out3?: string;
  in4?: string; out4?: string;
  in5?: string; out5?: string;
  must?: number; fact?: number; absent?: number;
  reason?: string; leaveHour?: number; leaveName?: string;
  otHour?: number; late?: number; early?: number;
  /** 当天实际打卡段数（1~5），后端给出 */
  segments?: number;
};

/** 班次中的一段：应上班/下班时间 + 该方向是否需要打卡（KQ_Class.SectN_InCard：0=否 1=是 2=可） */
type ClassSegment = {
  no: number;
  inTime?: string;
  outTime?: string;
  needIn: boolean;
  needOut: boolean;
};

/** 班次定义，后端按 Class_No 放在顶层 classes 里下发 */
type ClassInfo = {
  classNo: string;
  className?: string;
  segments: ClassSegment[];
};

/** 后端在同一响应里给的区间汇总，前端直接渲染，不再各算一套 */
type AttendanceSummary = {
  mustDays: number; factDays: number;
  lateCount: number; earlyCount: number; absentCount: number; leaveCount: number;
  leaveHours: number; otHours: number; mustHours: number; factHours: number; rate: number;
};

type AttendanceResponse = {
  success?: boolean;
  source?: 'daily' | 'history' | 'mixed' | 'none';
  calculated?: boolean;
  asOf?: string;
  rows?: AttendanceRow[];
  classes?: Record<string, ClassInfo>;
  summary?: AttendanceSummary;
  code?: string;
  message?: string;
};

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

/**
 * 汇总兜底：正常以后端 summary 为准；仅在对接旧版后端（只返回数组）时本地按同一口径算一遍，
 * 避免统计卡整块显示 0。口径与 MobileQueryController.BuildSummary 保持一致。
 */
function summarize(rows: AttendanceRow[]): AttendanceSummary {
  const s: AttendanceSummary = {
    mustDays: 0, factDays: 0, lateCount: 0, earlyCount: 0, absentCount: 0, leaveCount: 0,
    leaveHours: 0, otHours: 0, mustHours: 0, factHours: 0, rate: 0,
  };
  rows.forEach((r) => {
    const must = Number(r.must) || 0;
    const fact = Number(r.fact) || 0;
    if (must > 0) { s.mustDays += 1; s.mustHours += must; }
    if (fact > 0) { s.factDays += 1; s.factHours += fact; }
    if ((Number(r.absent) || 0) > 0) s.absentCount += 1;
    if ((Number(r.late) || 0) > 0) s.lateCount += 1;
    if ((Number(r.early) || 0) > 0) s.earlyCount += 1;
    if ((Number(r.leaveHour) || 0) > 0) { s.leaveCount += 1; s.leaveHours += Number(r.leaveHour); }
    if ((Number(r.otHour) || 0) > 0) s.otHours += Number(r.otHour);
  });
  s.leaveHours = Math.round(s.leaveHours * 100) / 100;
  s.otHours = Math.round(s.otHours * 100) / 100;
  s.rate = s.mustDays > 0 ? Math.round((s.factDays * 1000) / s.mustDays) / 10 : 0;
  return s;
}

export default function Attendance(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const [view, setView] = useState<'month' | 'day'>('month');
  const [month, setMonth] = useState(dayjs().startOf('month'));
  const [selectedDate, setSelectedDate] = useState(dayjs());

  // 附加10：考勤从后端获取（KQ_Account 决定 KQ_Daily/KQ_DailyHistory，缺数或近3天自动执行 KQ_pd_CalcDaily）
  const [monthRows, setMonthRows] = useState<AttendanceRow[]>([]);
  const [classes, setClasses] = useState<Record<string, ClassInfo>>({});
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [asOf, setAsOf] = useState('');

  useEffect(() => {
    let cancelled = false;
    const bgn = month.format('YYYY-MM-DD');
    const end = month.endOf('month').format('YYYY-MM-DD');
    m.attendance(bgn, end)
      .then((res: AttendanceResponse | AttendanceRow[]) => {
        if (cancelled) return;
        // 新契约：{ success, source, calculated, asOf, rows, classes, summary }；旧版后端仍返回裸数组，一并兼容
        const legacy = Array.isArray(res);
        const payload = legacy ? null : (res as AttendanceResponse);
        if (payload && payload.success === false) {
          Toast.show({ content: payload.message || '考勤数据加载失败，请稍后重试' });
          setMonthRows([]);
          setClasses({});
          setSummary(null);
          setAsOf('');
          return;
        }
        const rows = legacy ? (res as AttendanceRow[]) : (payload?.rows ?? []);
        setMonthRows(rows);
        setClasses(legacy ? {} : (payload?.classes ?? {}));
        setSummary(payload?.summary ?? null);
        setAsOf(payload?.asOf ?? '');
      })
      .catch((err: any) => {
        if (cancelled) return;
        // 旧实现在这里静默吞掉异常，接口一挂整月都显示“休息”，看起来像没数据
        setMonthRows([]);
        setClasses({});
        setSummary(null);
        setAsOf('');
        Toast.show({ content: err?.message || '考勤数据加载失败，请稍后重试' });
      });
    return () => { cancelled = true; };
  }, [month]);

  const getStatus = (date: Dayjs): DayStatus => {
    if (date.isAfter(dayjs(), 'day')) return 'future';
    const row = monthRows.find((r) => r.date === date.format('YYYY-MM-DD'));
    if (!row) return 'rest';
    if (Number(row.absent) > 0) return 'absent';
    if (Number(row.late) > 0) return 'late';
    if (Number(row.early) > 0) return 'early';
    if (Number(row.leaveHour) > 0) return 'leave';
    return 'normal';
  };

  const days = useMemo(() => {
    const first = month.startOf('month');
    const count = month.daysInMonth();
    const blanks = Array.from({ length: first.day() }, () => null as Dayjs | null);
    return blanks.concat(Array.from({ length: count }, (_, index) => first.add(index, 'day')));
  }, [month]);

  const selectedStatus = getStatus(selectedDate);
  const selRow = monthRows.find((r) => r.date === selectedDate.format('YYYY-MM-DD'));
  // 该班次所有段都免刷卡（segments 为空）：明确提示，不显示空的打卡项
  const selClass = selRow?.classNo ? classes[selRow.classNo] : undefined;
  const noCheckNeeded = !!selClass && (selClass.segments?.length ?? 0) === 0;

  // 明细只显示「当天班次需要打卡的时段」：班次配了几段、哪个方向要刷卡，就显示几项；
  // 应打卡时间取 KQ_Class.SectN_InTime/OutTime，实打卡取 KQ_Daily.SectN_InFact/OutFact。
  // 班次定义拿不到（历史班次已删除等）时退回按实际打卡展开。
  const checkPoints = useMemo(() => {
    type Point = { key: string; label: string; expect?: string; actual?: string };
    if (!selRow) return [] as Point[];
    const facts = [
      { in: selRow.in1, out: selRow.out1 },
      { in: selRow.in2, out: selRow.out2 },
      { in: selRow.in3, out: selRow.out3 },
      { in: selRow.in4, out: selRow.out4 },
      { in: selRow.in5, out: selRow.out5 },
    ];
    const info = selRow.classNo ? classes[selRow.classNo] : undefined;
    const points: Point[] = [];
    if (info && info.segments && info.segments.length > 0) {
      const multi = info.segments.length > 1;
      info.segments.forEach((seg) => {
        const fact = facts[seg.no - 1] || {};
        const prefix = multi ? `第${seg.no}段` : '';
        if (seg.needIn) {
          points.push({ key: `in-${seg.no}`, label: `${prefix}上班打卡`, expect: seg.inTime, actual: fact.in });
        }
        if (seg.needOut) {
          points.push({ key: `out-${seg.no}`, label: `${prefix}下班打卡`, expect: seg.outTime, actual: fact.out });
        }
      });
      return points;
    }
    facts.forEach((pair, index) => {
      const hasValue = !!(pair.in || pair.out);
      if (index > 0 && !hasValue) return;
      const prefix = index === 0 ? '' : `第${index + 1}段`;
      points.push({ key: `in-${index}`, label: `${prefix}上班打卡`, actual: pair.in });
      points.push({ key: `out-${index}`, label: `${prefix}下班打卡`, actual: pair.out });
    });
    return points;
  }, [selRow, classes]);

  const exceptionText = selRow
    ? selRow.reason
      || (Number(selRow.absent) > 0 ? '旷工'
        : Number(selRow.late) > 0 ? `迟到 ${Math.round(Number(selRow.late))} 分钟`
          : Number(selRow.early) > 0 ? `早退 ${Math.round(Number(selRow.early))} 分钟`
            : Number(selRow.leaveHour) > 0 ? `请假 ${selRow.leaveHour} 小时${selRow.leaveName ? `（${selRow.leaveName}）` : ''}`
              : '无异常')
    : '无考勤记录';

  const effectiveSummary = summary ?? summarize(monthRows);
  const stats = [
    { label: '应出勤', value: effectiveSummary.mustDays, color: 'text-gray-900' },
    { label: '实出勤', value: effectiveSummary.factDays, color: 'text-gray-900' },
    { label: '迟到', value: effectiveSummary.lateCount, color: 'text-orange-600' },
    { label: '早退', value: effectiveSummary.earlyCount, color: 'text-yellow-600' },
    { label: '缺卡', value: effectiveSummary.absentCount, color: 'text-red-500' },
    { label: '请假', value: effectiveSummary.leaveCount, color: 'text-blue-600' },
    { label: '加班(小时)', value: effectiveSummary.otHours, color: 'text-purple-600' },
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
            <div className="mt-4 text-xs text-gray-400">
              统计数据由考勤子系统汇总{asOf ? `，更新于 ${asOf}` : ''}；H5 端只读展示。
            </div>
          </Card>
        )}

        {view === 'day' && (
          <Card className="!rounded-2xl !border !border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900">{selectedDate.format('YYYY年MM月DD日')} 考勤明细</h2>
                <p className="text-xs text-gray-400 mt-1">{selRow?.className || selRow?.classNo || '--'}</p>
              </div>
              <Tag color={selectedStatus === 'normal' ? 'success' : selectedStatus === 'rest' ? 'default' : selectedStatus === 'future' ? 'default' : 'warning'}>
                {statusMap[selectedStatus].text || '未到期'}
              </Tag>
            </div>
            <div className="space-y-3">
              {noCheckNeeded ? (
                <div className="rounded-2xl bg-gray-50 p-3 text-sm text-gray-500">该班次无需打卡</div>
              ) : (checkPoints.length > 0 ? checkPoints : [
                { key: 'in-empty', label: '上班打卡', expect: undefined, actual: undefined },
                { key: 'out-empty', label: '下班打卡', expect: undefined, actual: undefined },
              ]).map((point) => (
                <div key={point.key} className="flex items-center justify-between rounded-2xl bg-gray-50 p-3">
                  <div className="flex items-center gap-3">
                    {point.key.startsWith('in')
                      ? <CheckCircleOutlined className={point.actual ? 'text-green-500' : 'text-gray-300'} />
                      : <ClockCircleOutlined className={point.actual ? 'text-green-500' : 'text-gray-300'} />}
                    <div>
                      <div>{point.label}</div>
                      <div className="text-xs text-gray-400 mt-1">应 {point.expect || '--'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono">{point.actual || '--'}</div>
                    <div className="text-xs text-gray-400 mt-1">实打卡</div>
                  </div>
                </div>
              ))}
              <div className="rounded-xl bg-orange-50 p-3 text-xs text-orange-700">{exceptionText}</div>
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
