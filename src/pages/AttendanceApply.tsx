import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, NavBar, Picker, Tabs, Tag, TextArea, Toast } from 'antd-mobile';
import { FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useApp } from '../context/AppContext';
import type { ApplicationStatus, AttendanceApplication } from '../data/mock';
import { m } from '../lib/api';

type ApplyTab = 'form' | 'mine';
type ApplyKind = 'resign' | 'leave' | 'appeal';

const defaultLeaveTypes = ['事假', '病假', '年假', '调休', '婚假', '产假', '丧假'].map((item) => ({ label: item, value: item }));
const clockTypes = ['上班', '下班'].map((item) => ({ label: item, value: item }));
const appealTypes = ['迟到误判', '早退误判', '缺卡异常'].map((item) => ({ label: item, value: item }));

const statusMap: Record<ApplicationStatus, { text: string; color: string }> = {
  pending: { text: '审批中', color: 'warning' },
  approved: { text: '已通过', color: 'success' },
  rejected: { text: '已驳回', color: 'danger' },
  cancelled: { text: '已撤回', color: 'default' },
};

export default function AttendanceApply(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { attendanceApplications, refreshAttendanceApplications } = useApp();
  const [tab, setTab] = useState<ApplyTab>('form');
  const [kind, setKind] = useState<ApplyKind>('resign');
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [time, setTime] = useState('08:30');
  const [clockType, setClockType] = useState('');
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('12:00');
  const [appealType, setAppealType] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [picker, setPicker] = useState<'clock' | 'leave' | 'appeal' | null>(null);
  const [kinds, setKinds] = useState<{ label: string; value: string }[]>(defaultLeaveTypes);

  // 假种从后端 KQ_LeaveKind 获取
  useEffect(() => {
    m.leaveKinds().then((rows) => {
      if (Array.isArray(rows) && rows.length > 0) {
        setKinds(rows.map((k: any) => ({ label: k.Kind_Name || k.Kind_No, value: k.Kind_No })));
      }
    }).catch(() => {});
  }, []);

  // 补签月限：以后端「本月已提交（待审批+已通过）」为准，不再数本地历史条数
  const [resignUsed, setResignUsed] = useState(0);
  const [resignLimit, setResignLimit] = useState(3);

  const loadResignCount = useCallback(async (): Promise<void> => {
    try {
      const r = await m.attapplyResignCount();
      setResignUsed(Number(r?.count) || 0);
      setResignLimit(Number(r?.limit) || 3);
    } catch { /* 拉不到就保持上一次的值 */ }
  }, []);

  useEffect(() => { void loadResignCount(); }, [loadResignCount]);

  // 进入页面时同步一次（审批状态可能在后台变化）；失败要与「确实没有记录」区分开
  const [listError, setListError] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const reloadList = useCallback(async (): Promise<void> => {
    setListLoading(true);
    const ok = await refreshAttendanceApplications();
    setListError(ok ? '' : '申请记录加载失败，请检查网络或稍后重试');
    setListLoading(false);
  }, [refreshAttendanceApplications]);

  useEffect(() => { void reloadList(); }, [reloadList]);

  const validate = (): boolean => {
    if (kind === 'resign' && resignUsed >= resignLimit) {
      Toast.show({ content: `本月补签次数已达上限（${resignLimit}次）`, position: 'center' });
      return false;
    }
    if (kind === 'resign' && (!date || !time || !clockType)) {
      Toast.show({ content: '请完整选择补签日期、时间和类型', position: 'center' });
      return false;
    }
    if (kind === 'leave' && (!leaveType || !startDate || !endDate || dayjs(endDate).isBefore(dayjs(startDate)))) {
      Toast.show({ content: '请完整选择请假类型和起止日期', position: 'center' });
      return false;
    }
    if (kind === 'leave' && (!startTime || !endTime)) {
      Toast.show({ content: '请选择请假起止时间', position: 'center' });
      return false;
    }
    if (kind === 'leave' && startDate === endDate && startTime >= endTime) {
      Toast.show({ content: '当天请假开始时间需早于结束时间', position: 'center' });
      return false;
    }
    if (kind === 'appeal' && (!date || !appealType)) {
      Toast.show({ content: '请选择申诉日期与异常类型', position: 'center' });
      return false;
    }
    if (reason.trim().length < 5) {
      Toast.show({ content: '请填写至少5个字的申请原因', position: 'center' });
      return false;
    }
    return true;
  };

  // 三类申请都只写审批表 WX_KQ_Apply，审批通过后才写厂商考勤表（KQ_SupplyTime / KQ_Leave）
  const submit = async (): Promise<void> => {
    if (!validate()) return;
    setLoading(true);
    try {
      if (kind === 'leave') {
        const res = await m.leaveSubmit({
          kindNo: leaveType,
          timeBgn: `${startDate} ${startTime}`,
          timeEnd: `${endDate} ${endTime}`,
          remark: reason.trim(),
          scene: 'h5',
        });
        if (!res || !res.success) {
          Toast.show({ content: (res && res.msg) || '提交失败', position: 'center' });
          return;
        }
      } else if (kind === 'resign') {
        const res = await m.attapplyResign({
          date,
          time,
          clockType,
          reason: reason.trim(),
          scene: 'h5',
        });
        if (!res || !res.success) {
          Toast.show({ content: (res && res.msg) || '提交失败', position: 'center' });
          return;
        }
        setResignUsed(Number(res.used) || resignUsed + 1);
      } else {
        const res = await m.attapplyAppeal({
          date,
          appealType,
          reason: reason.trim(),
          scene: 'h5',
        });
        if (!res || !res.success) {
          Toast.show({ content: (res && res.msg) || '提交失败', position: 'center' });
          return;
        }
      }
      await reloadList();
      await loadResignCount();
      Toast.show({ content: '申请已提交，等待管理员审批', position: 'center' });
      setTab('mine');
    } catch (e) {
      Toast.show({ content: (e as Error).message || '网络异常，请重试', position: 'center' });
    } finally {
      setLoading(false);
    }
  };

  // 撤回：只有待审批的申请可以撤回，撤回后不占用补签月限
  const cancelApply = async (item: AttendanceApplication): Promise<void> => {
    if (!item.applyNo) return;
    try {
      const res = await m.attapplyCancel(item.applyNo);
      if (!res || !res.success) {
        Toast.show({ content: (res && res.msg) || '撤回失败', position: 'center' });
        return;
      }
      Toast.show({ content: '申请已撤回', position: 'center' });
      await reloadList();
      await loadResignCount();
    } catch (e) {
      Toast.show({ content: (e as Error).message || '撤回失败', position: 'center' });
    }
  };

  const pickerColumns = picker === 'clock' ? clockTypes : picker === 'leave' ? kinds : appealTypes;
  const pickerValue = picker === 'clock' ? clockType : picker === 'leave' ? leaveType : appealType;

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar onBack={() => setLocation('/attendance')} className="bg-white">考勤申请</NavBar>
      <Tabs activeKey={tab} onChange={(key) => setTab(key as ApplyTab)} className="bg-white">
        <Tabs.Tab title="发起申请" key="form" />
        <Tabs.Tab title="我的申请" key="mine" />
      </Tabs>

      {tab === 'form' ? (
        <div className="p-4 space-y-4">
          <Card className="!rounded-2xl !border !border-gray-100">
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { value: 'resign', label: '补签申请' },
                { value: 'leave', label: '请假申请' },
                { value: 'appeal', label: '异常申诉' },
              ].map((item) => (
                <button
                  key={item.value}
                  className={`h-11 rounded-xl text-sm ${kind === item.value ? 'bg-[#0064E6] text-white font-semibold' : 'bg-gray-100 text-gray-600'}`}
                  onClick={() => setKind(item.value as ApplyKind)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {kind === 'resign' && (
                <>
                  <label className="block">
                    <span className="text-sm text-gray-600">补签日期 *</span>
                    <input className="mt-2 w-full h-11 bg-gray-50 rounded-xl px-3 outline-none" type="date" max={dayjs().format('YYYY-MM-DD')} value={date} onChange={(event) => setDate(event.target.value)} />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-sm text-gray-600">补签时间 *</span>
                      <input className="mt-2 w-full h-11 bg-gray-50 rounded-xl px-3 outline-none" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
                    </label>
                    <button className="text-left" onClick={() => setPicker('clock')}>
                      <span className="text-sm text-gray-600">补签类型 *</span>
                      <div className="mt-2 h-11 bg-gray-50 rounded-xl px-3 flex items-center">{clockType || '请选择'}</div>
                    </button>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3 text-xs text-[#0064E6]">本月已使用补签 {resignUsed}/{resignLimit} 次（待审批 + 已通过）</div>
                </>
              )}

              {kind === 'leave' && (
                <>
                  <button className="w-full text-left" onClick={() => setPicker('leave')}>
                    <span className="text-sm text-gray-600">请假类型 *</span>
                    <div className="mt-2 h-11 bg-gray-50 rounded-xl px-3 flex items-center">{leaveType || '请选择'}</div>
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-sm text-gray-600">开始日期 *</span>
                      <input className="mt-2 w-full h-11 bg-gray-50 rounded-xl px-3 outline-none" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                    </label>
                    <label className="block">
                      <span className="text-sm text-gray-600">结束日期 *</span>
                      <input className="mt-2 w-full h-11 bg-gray-50 rounded-xl px-3 outline-none" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-sm text-gray-600">开始时间 *</span>
                      <input className="mt-2 w-full h-11 bg-gray-50 rounded-xl px-3 outline-none" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
                    </label>
                    <label className="block">
                      <span className="text-sm text-gray-600">结束时间 *</span>
                      <input className="mt-2 w-full h-11 bg-gray-50 rounded-xl px-3 outline-none" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
                    </label>
                  </div>
                </>
              )}

              {kind === 'appeal' && (
                <>
                  <label className="block">
                    <span className="text-sm text-gray-600">申诉日期 *</span>
                    <input className="mt-2 w-full h-11 bg-gray-50 rounded-xl px-3 outline-none" type="date" max={dayjs().format('YYYY-MM-DD')} value={date} onChange={(event) => setDate(event.target.value)} />
                  </label>
                  <button className="w-full text-left" onClick={() => setPicker('appeal')}>
                    <span className="text-sm text-gray-600">异常类型 *</span>
                    <div className="mt-2 h-11 bg-gray-50 rounded-xl px-3 flex items-center">{appealType || '请选择'}</div>
                  </button>
                </>
              )}

              <label className="block">
                <span className="text-sm text-gray-600">申请原因 *</span>
                <TextArea className="mt-2 !bg-gray-50 !rounded-xl !p-3" rows={4} maxLength={200} showCount value={reason} onChange={setReason} placeholder="请说明申请原因，审批人可见" />
              </label>
              <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500 leading-5">
                提交后由管理员审批，结果会在「我的申请」与消息中心同步；待审批阶段可自行撤回。如需提交证明材料，请在申请原因中说明并到考勤窗口补交。
              </div>
              <Button block color="primary" size="large" loading={loading} className="!rounded-full !h-12" onClick={submit}>提交申请</Button>
            </div>
          </Card>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {listLoading && attendanceApplications.length === 0 && (
            <div className="text-center text-sm text-gray-400 mt-16">加载中…</div>
          )}
          {!listLoading && listError && (
            <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 leading-5">
              {listError}
              <button className="ml-2 text-[#0064E6]" onClick={() => { void reloadList(); }}>重试</button>
            </div>
          )}
          {!listLoading && !listError && attendanceApplications.length === 0 && (
            <div className="text-center text-sm text-gray-400 mt-16">暂无申请记录</div>
          )}
          {attendanceApplications.map((item) => (
            <Card key={item.id} className="!rounded-2xl !border !border-gray-100">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0064E6] flex items-center justify-center"><FileTextOutlined /></div>
                  <div>
                    <div className="font-semibold text-gray-900">{item.title}</div>
                    <div className="text-xs text-gray-400 mt-1">{item.type} · {item.submitTime}</div>
                  </div>
                </div>
                <Tag color={statusMap[item.status].color}>{statusMap[item.status].text}</Tag>
              </div>
              <div className="mt-4 text-sm space-y-2">
                <div className="flex justify-between"><span className="text-gray-500">申请时间</span><span>{item.dateRange}</span></div>
                <div className="rounded-xl bg-gray-50 p-3 text-gray-600 leading-5">{item.reason}</div>
                {item.auditRemark && (
                  <div className={`rounded-xl p-3 leading-5 ${item.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>审批意见：{item.auditRemark}</div>
                )}
                {item.canCancel && item.applyNo && (
                  <button className="text-xs text-[#0064E6]" onClick={() => cancelApply(item)}>撤回申请</button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Picker
        columns={[pickerColumns]}
        visible={picker !== null}
        value={pickerValue ? [pickerValue] : []}
        onClose={() => setPicker(null)}
        onConfirm={(value) => {
          const selected = String(value[0] || '');
          if (picker === 'clock') setClockType(selected);
          if (picker === 'leave') setLeaveType(selected);
          if (picker === 'appeal') setAppealType(selected);
          setPicker(null);
        }}
      />
    </div>
  );
}
