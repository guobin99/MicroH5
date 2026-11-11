import React, { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Input, NavBar, Picker, Tabs, Tag, TextArea, Toast } from 'antd-mobile';
import { FileAddOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useApp } from '../context/AppContext';
import type { ApplicationStatus } from '../data/mock';
import { makeId } from '../lib/utils';

type ApplyTab = 'form' | 'mine';
type ApplyKind = 'resign' | 'leave' | 'appeal';

const leaveTypes = ['事假', '病假', '年假', '调休', '婚假', '产假', '丧假'].map((item) => ({ label: item, value: item }));
const clockTypes = ['上班', '下班'].map((item) => ({ label: item, value: item }));
const appealTypes = ['迟到误判', '早退误判', '缺卡异常'].map((item) => ({ label: item, value: item }));

const statusMap: Record<ApplicationStatus, { text: string; color: string }> = {
  pending: { text: '审批中', color: 'warning' },
  approved: { text: '已通过', color: 'success' },
  rejected: { text: '已驳回', color: 'danger' },
};

export default function AttendanceApply(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { attendanceApplications, addAttendanceApplication } = useApp();
  const [tab, setTab] = useState<ApplyTab>('form');
  const [kind, setKind] = useState<ApplyKind>('resign');
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [time, setTime] = useState('08:30');
  const [clockType, setClockType] = useState('');
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [appealType, setAppealType] = useState('');
  const [reason, setReason] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [picker, setPicker] = useState<'clock' | 'leave' | 'appeal' | null>(null);

  const monthlyResignUsed = useMemo(() => attendanceApplications.filter((item) => item.type === '补签').length, [attendanceApplications]);

  const validate = (): boolean => {
    if (kind === 'resign' && monthlyResignUsed >= 3) {
      Toast.show({ content: '本月补签次数已达上限（3次）', position: 'center' });
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

  const submit = (): void => {
    if (!validate()) return;
    setLoading(true);
    window.setTimeout(() => {
      const typeText = kind === 'resign' ? '补签' : kind === 'leave' ? '请假' : '申诉';
      const title = kind === 'resign' ? `${clockType}补签` : kind === 'leave' ? `${leaveType}申请` : appealType;
      const dateRange = kind === 'leave' ? `${startDate} 至 ${endDate}` : `${date}${kind === 'resign' ? ` ${time}` : ''}`;
      addAttendanceApplication({
        id: makeId('AP'),
        type: typeText as '补签' | '请假' | '申诉',
        title,
        dateRange,
        reason: reason.trim(),
        status: 'pending',
        submitTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
        attachmentName,
      });
      setLoading(false);
      Toast.show({ content: '申请已提交，等待审批', position: 'center' });
      setTab('mine');
    }, 700);
  };

  const pickerColumns = picker === 'clock' ? clockTypes : picker === 'leave' ? leaveTypes : appealTypes;
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
                <button key={item.value} className={`h-11 rounded-xl text-sm ${kind === item.value ? 'bg-[#0064E6] text-white font-semibold' : 'bg-gray-100 text-gray-600'}`} onClick={() => setKind(item.value as ApplyKind)}>
                  {item.label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {kind === 'resign' && (
                <>
                  <label className="block"><span className="text-sm text-gray-600">补签日期 *</span><input className="mt-2 w-full h-11 bg-gray-50 rounded-xl px-3 outline-none" type="date" max={dayjs().format('YYYY-MM-DD')} value={date} onChange={(event) => setDate(event.target.value)} /></label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block"><span className="text-sm text-gray-600">补签时间 *</span><input className="mt-2 w-full h-11 bg-gray-50 rounded-xl px-3 outline-none" type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
                    <button className="text-left" onClick={() => setPicker('clock')}><span className="text-sm text-gray-600">补签类型 *</span><div className="mt-2 h-11 bg-gray-50 rounded-xl px-3 flex items-center">{clockType || '请选择'}</div></button>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3 text-xs text-[#0064E6]">本月已使用补签 {monthlyResignUsed}/3 次</div>
                </>
              )}

              {kind === 'leave' && (
                <>
                  <button className="w-full text-left" onClick={() => setPicker('leave')}><span className="text-sm text-gray-600">请假类型 *</span><div className="mt-2 h-11 bg-gray-50 rounded-xl px-3 flex items-center">{leaveType || '请选择'}</div></button>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block"><span className="text-sm text-gray-600">开始日期 *</span><input className="mt-2 w-full h-11 bg-gray-50 rounded-xl px-3 outline-none" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
                    <label className="block"><span className="text-sm text-gray-600">结束日期 *</span><input className="mt-2 w-full h-11 bg-gray-50 rounded-xl px-3 outline-none" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
                  </div>
                </>
              )}

              {kind === 'appeal' && (
                <>
                  <label className="block"><span className="text-sm text-gray-600">申诉日期 *</span><input className="mt-2 w-full h-11 bg-gray-50 rounded-xl px-3 outline-none" type="date" max={dayjs().format('YYYY-MM-DD')} value={date} onChange={(event) => setDate(event.target.value)} /></label>
                  <button className="w-full text-left" onClick={() => setPicker('appeal')}><span className="text-sm text-gray-600">异常类型 *</span><div className="mt-2 h-11 bg-gray-50 rounded-xl px-3 flex items-center">{appealType || '请选择'}</div></button>
                </>
              )}

              <label className="block"><span className="text-sm text-gray-600">申请原因 *</span><TextArea className="mt-2 !bg-gray-50 !rounded-xl !p-3" rows={4} maxLength={200} showCount value={reason} onChange={setReason} placeholder="请说明申请原因，审批人可见" /></label>
              <label className="block border border-dashed border-gray-200 rounded-2xl p-4 text-center cursor-pointer">
                <input className="hidden" type="file" onChange={(event) => setAttachmentName(event.target.files?.[0]?.name || '')} />
                <FileAddOutlined className="text-2xl text-[#0064E6]" />
                <div className="text-sm text-gray-700 mt-2">{attachmentName || '上传佐证附件（可选）'}</div>
                <div className="text-xs text-gray-400 mt-1">支持图片、PDF，正式环境上传至平台对象存储</div>
              </label>
              <Button block color="primary" size="large" loading={loading} className="!rounded-full !h-12" onClick={submit}>提交申请</Button>
            </div>
          </Card>
        </div>
      ) : (
        <div className="p-4 space-y-3">
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
                {item.attachmentName && <div className="text-xs text-gray-400">附件：{item.attachmentName}</div>}
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
