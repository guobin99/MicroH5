import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Empty, Modal, NavBar, Radio, Tag, TextArea, Toast } from 'antd-mobile';
import { CheckCircleOutlined, CloseCircleOutlined, PictureOutlined, UserAddOutlined } from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import { m } from '../lib/api';
import type { VisitorRecord } from '../data/mock';

interface CardOption { cardNo: string; remark: string }

export default function VisitorApprovals(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { visitorRecords, approveVisitor, rejectVisitor } = useApp();
  const [rejecting, setRejecting] = useState<VisitorRecord | null>(null);
  const [reason, setReason] = useState('');

  // 可选临时卡：卡池为空时自动分配/只发二维码，不显示选择
  const [cards, setCards] = useState<CardOption[]>([]);
  const [approving, setApproving] = useState<VisitorRecord | null>(null);
  const [cardChoice, setCardChoice] = useState('');
  const [photoView, setPhotoView] = useState('');

  const loadCards = (): void => {
    m.visitorCards()
      .then((res) => setCards(Array.isArray(res?.cards) ? res.cards : []))
      .catch(() => setCards([]));
  };
  useEffect(() => { loadCards(); }, []);

  // 只列“我是被访人”的待审批；代录别人的记录不能由我审批
  const pending = useMemo(() => visitorRecords.filter((item) => item.status === 'pending' && item.canHandle), [visitorRecords]);

  const doApprove = async (record: VisitorRecord, cardNo: string, noCard = false): Promise<void> => {
    const res = await approveVisitor(record.id, cardNo, noCard);
    if (!res.success) {
      Toast.show({ content: res.msg || '审批失败', position: 'center' });
      return;
    }
    setApproving(null);
    setCardChoice('');
    loadCards();          // 卡已占用，刷新可选列表
    loadCards();          // 卡已占用，刷新可选列表
    if (res.cardNo) {
      Toast.show({ content: `已通过，临时卡 ${res.cardNo} 已分配`, position: 'center' });
    } else {
      Toast.show({ content: res.cardTip || '已通过，已生成二维码凭证', position: 'center' });
    }
  };

  // 只有“确实有卡可分配”时才让选；没卡直接通过（只发二维码），不打扰
  const approve = (record: VisitorRecord): void => {
    if (cards.length === 0) { void doApprove(record, '', true); return; }
    setApproving(record);
    setCardChoice('none');   // 默认“不分配卡”（第一个选项）
  };

  // 弹窗里三个选择：不分配（none）/ 自动分配（空串）/ 指定卡号
  const confirmApprove = (): void => {
    if (!approving) return;
    if (cardChoice === 'none') { void doApprove(approving, '', true); return; }
    void doApprove(approving, cardChoice, false);
  };

  const reject = async (): Promise<void> => {
    if (!rejecting) return;
    if (reason.trim().length < 4) {
      Toast.show({ content: '请填写驳回原因，至少4个字', position: 'center' });
      return;
    }
    await rejectVisitor(rejecting.id, reason.trim());
    setRejecting(null);
    setReason('');
    Toast.show({ content: '已驳回', position: 'center' });
  };

  const viewPhoto = async (record: VisitorRecord): Promise<void> => {
    try {
      const res = await m.visitorPhoto(record.applyNo || '');
      if (!res || !res.photo) { Toast.show({ content: '该访客未采集照片', position: 'center' }); return; }
      setPhotoView(res.photo);
    } catch {
      Toast.show({ content: '照片加载失败', position: 'center' });
    }
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
                  <div className="font-semibold text-gray-900">{record.visitorName || '访客'}</div>
                  <div className="text-xs text-gray-400 mt-1">{record.visitorPhone} · {record.company || '个人来访'}</div>
                </div>
              </div>
              <Tag color="warning">待审批</Tag>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">被访人</span>
                <span>
                  {record.respondentName
                    ? `${record.respondentName}${record.department ? ' · ' + record.department : ''}`
                    : (record.department || '本人')}
                </span>
              </div>
              <div className="flex justify-between"><span className="text-gray-500">来访时间</span><span>{record.visitDate} {record.visitTime}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">访客类型</span><span>{record.visitorType || '临时访客'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">访客人数</span><span>{record.companions + 1} 人</span></div>
              {record.plate && <div className="flex justify-between"><span className="text-gray-500">车牌号</span><span>{record.plate}</span></div>}
              <div className="rounded-xl bg-gray-50 p-3 text-gray-600 leading-5">事由：{record.reason}</div>
              {record.carryItems && (
                <div className="rounded-xl bg-amber-50 p-3 text-amber-700 leading-5 text-xs">携带物品：{record.carryItems}</div>
              )}
              {record.hasPhoto && (
                <button className="text-xs text-[#0064E6] flex items-center gap-1" onClick={() => viewPhoto(record)}>
                  <PictureOutlined /> 查看访客照片
                </button>
              )}
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

      {/* 通过前选卡：只有卡池里有空闲卡时才出现 */}
      <Modal
        visible={approving !== null}
        title="选择临时卡"
        content={
          <div>
            <div className="text-xs text-gray-500 mb-3 leading-5">
              当前空闲临时卡 {cards.length} 张。默认不分配（只发二维码），需要刷闸机时再选卡。
            </div>
            <Radio.Group value={cardChoice} onChange={(v) => setCardChoice(String(v))}>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <Radio value="none">不分配卡（仅二维码）</Radio>
                <Radio value="">自动分配空闲卡</Radio>
                {cards.map((c) => (
                  <Radio key={c.cardNo} value={c.cardNo}>
                    指定卡号 {c.cardNo}{c.remark ? `（${c.remark}）` : ''}
                  </Radio>
                ))}
              </div>
            </Radio.Group>
          </div>
        }
        closeOnAction
        actions={[
          { key: 'cancel', text: '取消' },
          {
            key: 'ok',
            text: '确认通过',
            primary: true,
            onClick: confirmApprove,
          },
        ]}
        onClose={() => setApproving(null)}
      />

      <Modal
        visible={rejecting !== null}
        title="填写驳回原因"
        content={<TextArea placeholder="请说明驳回原因，将通知被访人与访客" rows={4} maxLength={100} showCount value={reason} onChange={setReason} />}
        actions={[
          { key: 'cancel', text: '取消', onClick: () => setRejecting(null) },
          { key: 'confirm', text: '确认驳回', danger: true, onClick: () => { void reject(); } },
        ]}
        onClose={() => setRejecting(null)}
      />

      <Modal
        visible={!!photoView}
        title="访客照片"
        content={photoView ? <img src={photoView} alt="访客照片" className="w-full rounded-xl" /> : null}
        closeOnAction
        actions={[{ key: 'close', text: '关闭', primary: true }]}
        onClose={() => setPhotoView('')}
      />
    </div>
  );
}
