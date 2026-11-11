import React, { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Dialog, Empty, Modal, NavBar, Tabs, Tag, Toast } from 'antd-mobile';
import { CheckCircleOutlined, QrcodeOutlined, UserAddOutlined } from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import TimeRangeFilter, { matchTimeRange, type TimeRange } from '../components/TimeRangeFilter';
import { useApp } from '../context/AppContext';
import type { VisitorRecord } from '../data/mock';

const statusMap = {
  approved: { color: 'success', text: '已通过' },
  pending: { color: 'warning', text: '审批中' },
  rejected: { color: 'danger', text: '已驳回' },
  completed: { color: 'default', text: '已签离' },
} as const;

export default function VisitorRecords(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { visitorRecords, signOutVisitor } = useApp();
  const [status, setStatus] = useState('all');
  const [range, setRange] = useState<TimeRange>('30d');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [credential, setCredential] = useState<VisitorRecord | null>(null);

  const filtered = useMemo(() => visitorRecords
    .filter((item) => status === 'all' || item.status === status)
    .filter((item) => matchTimeRange(item.applyTime, range, start, end)),
  [end, range, start, status, visitorRecords]);
  const pendingCount = visitorRecords.filter((item) => item.status === 'pending').length;

  const signOut = (record: VisitorRecord): void => {
    Dialog.confirm({
      title: '确认访客签离',
      content: `确认 ${record.visitorName} 已离开园区？签离后通行凭证立即失效。`,
      confirmText: '确认签离',
      cancelText: '取消',
      onConfirm: () => {
        signOutVisitor(record.id);
        Toast.show({ content: '已完成签离', position: 'center' });
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar
        onBack={() => setLocation('/')}
        className="bg-white"
        right={<Button size="small" color="primary" onClick={() => setLocation('/visitor-appointment')}>+ 预约</Button>}
      >
        访客记录
      </NavBar>
      <TimeRangeFilter range={range} start={start} end={end} onRangeChange={setRange} onStartChange={setStart} onEndChange={setEnd} />
      <Tabs activeKey={status} onChange={setStatus} className="bg-white">
        <Tabs.Tab title="全部" key="all" />
        <Tabs.Tab title="已通过" key="approved" />
        <Tabs.Tab title={`待审批(${pendingCount})`} key="pending" />
        <Tabs.Tab title="已驳回" key="rejected" />
        <Tabs.Tab title="已签离" key="completed" />
      </Tabs>

      <div className="p-4 space-y-3">
        {pendingCount > 0 && (
          <Button block color="primary" fill="outline" onClick={() => setLocation('/visitor-approvals')}>
            进入访客审批（待办 {pendingCount}）
          </Button>
        )}
        {filtered.length > 0 ? filtered.map((record) => (
          <Card key={record.id} className="!rounded-2xl !border !border-gray-100">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center"><UserAddOutlined /></div>
                <div>
                  <div className="font-semibold text-gray-900">{record.visitorName}</div>
                  <div className="text-xs text-gray-400 mt-1">{record.visitorPhone} · {record.company || '个人来访'}</div>
                </div>
              </div>
              <Tag color={statusMap[record.status].color}>{statusMap[record.status].text}</Tag>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">来访时间</span><span>{record.visitDate} {record.visitTime}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">受访部门</span><span>{record.department}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">随行人数</span><span>{record.companions} 人</span></div>
              <div className="rounded-xl bg-gray-50 p-3 text-gray-600 leading-5">事由：{record.reason}</div>
              {record.rejectReason && <div className="rounded-xl bg-red-50 p-3 text-red-500 text-xs">驳回原因：{record.rejectReason}</div>}
              {record.signOutTime && <div className="text-xs text-gray-400">签离时间：{record.signOutTime}</div>}
            </div>

            {record.status === 'approved' && record.passCode && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <Button size="small" fill="outline" className="flex-1" onClick={() => setCredential(record)}>
                  <QrcodeOutlined /> 通行凭证
                </Button>
                <Button size="small" fill="outline" color="danger" className="flex-1" onClick={() => signOut(record)}>
                  <CheckCircleOutlined /> 确认签离
                </Button>
              </div>
            )}
          </Card>
        )) : (
          <Empty image={<UserAddOutlined className="text-6xl text-gray-300" />} description="暂无访客记录" className="mt-20" />
        )}
      </div>

      <Modal
        visible={credential !== null}
        title="访客通行凭证"
        content={credential && (
          <div className="text-center">
            <div className="inline-block p-4 bg-white rounded-2xl border border-gray-100 shadow-inner">
              <QRCodeSVG value={`VISITOR|${credential.id}|${credential.passCode}`} size={180} level="H" />
            </div>
            <div className="text-2xl font-bold font-mono mt-4">{credential.passCode}</div>
            <div className="text-xs text-gray-500 mt-2">{credential.visitDate} {credential.visitTime} · {credential.department}</div>
            <div className="text-xs text-gray-400 mt-1">凭证仅在预约时段与授权门点范围内有效，可通过微信分享给访客。</div>
          </div>
        )}
        closeOnAction
        actions={[{ key: 'close', text: '关闭' }]}
        onClose={() => setCredential(null)}
      />
    </div>
  );
}
