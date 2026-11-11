import React, { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Empty, Modal, NavBar, Tag, TextArea, Toast } from 'antd-mobile';
import { CheckCircleOutlined, CloseCircleOutlined, UserAddOutlined } from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import type { VisitorRecord } from '../data/mock';

export default function VisitorApprovals(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { visitorRecords, approveVisitor, rejectVisitor } = useApp();
  const [rejecting, setRejecting] = useState<VisitorRecord | null>(null);
  const [reason, setReason] = useState('');
  const pending = useMemo(() => visitorRecords.filter((item) => item.status === 'pending'), [visitorRecords]);

  const approve = (record: VisitorRecord): void => {
    approveVisitor(record.id);
    Toast.show({ content: '已通过，通行凭证已生成', position: 'center' });
  };

  const reject = (): void => {
    if (!rejecting) return;
    if (reason.trim().length < 4) {
      Toast.show({ content: '请填写驳回原因，至少4个字', position: 'center' });
      return;
    }
    rejectVisitor(rejecting.id, reason.trim());
    setRejecting(null);
    setReason('');
    Toast.show({ content: '已驳回并通知申请人', position: 'center' });
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar onBack={() => setLocation('/visitor-records')} className="bg-white">访客审批</NavBar>
      <div className="p-4 space-y-3">
        {pending.length > 0 ? pending.map((record) => (
          <Card key={record.id} className="!rounded-2xl !border !border-gray-100">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center"><UserAddOutlined /></div>
                <div>
                  <div className="font-semibold text-gray-900">{record.visitorName}</div>
                  <div className="text-xs text-gray-400 mt-1">{record.visitorPhone} · {record.company || '个人来访'}</div>
                </div>
              </div>
              <Tag color="warning">待审批</Tag>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">来访时间</span><span>{record.visitDate} {record.visitTime}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">受访部门</span><span>{record.department}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">随行人数</span><span>{record.companions} 人</span></div>
              <div className="rounded-xl bg-gray-50 p-3 text-gray-600 leading-5">事由：{record.reason}</div>
            </div>
            <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
              <Button block color="primary" onClick={() => approve(record)}><CheckCircleOutlined /> 通过</Button>
              <Button block color="danger" fill="outline" onClick={() => setRejecting(record)}><CloseCircleOutlined /> 驳回</Button>
            </div>
          </Card>
        )) : (
          <Empty image={<UserAddOutlined className="text-6xl text-gray-300" />} description="暂无待审批访客" className="mt-20" />
        )}
      </div>

      <Modal
        visible={rejecting !== null}
        title="填写驳回原因"
        content={<TextArea placeholder="请说明驳回原因，将通知被访人与访客" rows={4} maxLength={100} showCount value={reason} onChange={setReason} />}
        actions={[
          { key: 'cancel', text: '取消', onClick: () => setRejecting(null) },
          { key: 'confirm', text: '确认驳回', danger: true, onClick: reject },
        ]}
        onClose={() => setRejecting(null)}
      />
    </div>
  );
}
