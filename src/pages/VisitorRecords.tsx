import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Dialog, Empty, Modal, NavBar, Radio, Tabs, Tag, Toast } from 'antd-mobile';
import { CheckCircleOutlined, LoginOutlined, PictureOutlined, QrcodeOutlined, UserAddOutlined } from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import TimeRangeFilter, { matchTimeRange, type TimeRange } from '../components/TimeRangeFilter';
import { useApp } from '../context/AppContext';
import { m } from '../lib/api';
import type { VisitorRecord, VisitorStatus } from '../data/mock';

const statusMap: Record<VisitorStatus, { color: 'success' | 'warning' | 'danger' | 'default'; text: string }> = {
  approved: { color: 'success', text: '已通过' },
  checkedin: { color: 'success', text: '已到访' },
  pending: { color: 'warning', text: '审批中' },
  rejected: { color: 'danger', text: '已驳回' },
  completed: { color: 'default', text: '已签离' },
  expired: { color: 'default', text: '已过期' },
};

export default function VisitorRecords(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { visitorRecords, signOutVisitor, checkinVisitor, revokeVisitor } = useApp();
  const [status, setStatus] = useState('all');
  const [range, setRange] = useState<TimeRange>('30d');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [credential, setCredential] = useState<VisitorRecord | null>(null);
  const [photoView, setPhotoView] = useState('');

  // 签到时若该单还没有临时卡，给一次选卡机会（也可以不选，只发二维码）
  const [cards, setCards] = useState<{ cardNo: string; remark: string }[]>([]);
  const [checkinTarget, setCheckinTarget] = useState<VisitorRecord | null>(null);
  const [cardChoice, setCardChoice] = useState('');

  const loadCards = (): void => {
    m.visitorCards()
      .then((res) => setCards(Array.isArray(res?.cards) ? res.cards : []))
      .catch(() => setCards([]));
  };
  useEffect(() => { loadCards(); }, []);

  const filtered = useMemo(() => visitorRecords
    .filter((item) => status === 'all' || item.status === status)
    .filter((item) => matchTimeRange(item.applyTime, range, start, end)),
  [end, range, start, status, visitorRecords]);
  // 只有“我是被访人”的待审批才算我的待办（代录别人的不能由我审批）
  const pendingCount = visitorRecords.filter((item) => item.status === 'pending' && item.canHandle).length;

  // 到访签到：审批通过 ≠ 到访，签到后才允许签离
  // 已有卡 → 直接确认；没卡但卡池有可用卡 → 让选（可分配可不分配）；卡池没卡 → 直接签到只发二维码
  const checkin = (record: VisitorRecord): void => {
    if (record.cardNo) {
      Dialog.confirm({
        title: '确认访客到达',
        content: `确认 ${record.visitorName} 已到达并完成证件核验？签到后临时卡 ${record.cardNo} 与二维码凭证即可使用。`,
        confirmText: '确认到访',
        cancelText: '取消',
        onConfirm: async () => {
          const res = await checkinVisitor(record.id, '');
          Toast.show({ content: res.success ? '已完成到访签到' : (res.msg || '签到失败'), position: 'center' });
        },
      });
      return;
    }
    if (cards.length === 0) {
      Dialog.confirm({
        title: '确认访客到达',
        content: `确认 ${record.visitorName} 已到达？当前没有可用临时卡，签到后使用二维码凭证。`,
        confirmText: '确认到访',
        cancelText: '取消',
        onConfirm: async () => {
          const res = await checkinVisitor(record.id, '', true);
          Toast.show({ content: res.success ? '已签到（仅二维码凭证）' : (res.msg || '签到失败'), position: 'center' });
        },
      });
      return;
    }
    setCardChoice('none');   // 默认“不分配卡”（第一个选项）
    setCheckinTarget(record);
  };

  const doCheckin = async (record: VisitorRecord, cardNo: string, noCard = false): Promise<void> => {
    const res = await checkinVisitor(record.id, cardNo, noCard);
    if (!res.success) {
      Toast.show({ content: res.msg || '签到失败', position: 'center' });
      return;
    }
    setCheckinTarget(null);
    loadCards();          // 卡已占用，刷新可选列表
    if (res.cardNo) Toast.show({ content: `已签到，临时卡 ${res.cardNo} 已分配`, position: 'center' });
    else Toast.show({ content: res.cardTip || '已签到（仅二维码凭证）', position: 'center' });
  };

  // 访客照片：按申请单号取（列表里的证件号已脱敏）
  const viewPhoto = async (record: VisitorRecord): Promise<void> => {
    try {
      const res = await m.visitorPhoto(record.applyNo || '');
      if (!res || !res.photo) { Toast.show({ content: '该访客未采集照片', position: 'center' }); return; }
      setPhotoView(res.photo);
    } catch {
      Toast.show({ content: '照片加载失败', position: 'center' });
    }
  };

  const signOut = (record: VisitorRecord): void => {
    Dialog.confirm({
      title: '确认访客签离',
      content: `确认 ${record.visitorName} 已离开园区？签离后临时卡收回、二维码凭证立即失效。`,
      confirmText: '确认签离',
      cancelText: '取消',
      onConfirm: async () => {
        const res = await signOutVisitor(record.id);
        Toast.show({ content: res.success ? '已完成签离，临时卡已回收' : (res.msg || '签离失败'), position: 'center' });
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
        <Tabs.Tab title={`待审批(${pendingCount})`} key="pending" />
        <Tabs.Tab title="已通过" key="approved" />
        <Tabs.Tab title="已到访" key="checkedin" />
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
                  <div className="font-semibold text-gray-900 flex items-center gap-2">
                    {record.visitorName || '访客'}
                    {!record.canHandle && record.submittedByMe && (
                      <span className="text-[10px] px-1 rounded bg-gray-100 text-gray-500 font-normal">我代录</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{record.visitorPhone} · {record.company || '个人来访'}</div>
                </div>
              </div>
              <Tag color={statusMap[record.status].color}>{statusMap[record.status].text}</Tag>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">来访时间</span><span>{record.visitDate} {record.visitTime}</span></div>
              <div className="flex justify-between">
                <span className="text-gray-500">被访人</span>
                <span>{record.respondentName ? `${record.respondentName}${record.department ? ' · ' + record.department : ''}` : (record.department || '—')}</span>
              </div>
              <div className="flex justify-between"><span className="text-gray-500">访客人数</span><span>{record.companions + 1} 人</span></div>
              <div className="rounded-xl bg-gray-50 p-3 text-gray-600 leading-5">事由：{record.reason}</div>
              {record.hasPhoto && (
                <button className="text-xs text-[#0064E6] flex items-center gap-1" onClick={() => viewPhoto(record)}>
                  <PictureOutlined /> 查看访客照片
                </button>
              )}
              {record.rejectReason && <div className="rounded-xl bg-red-50 p-3 text-red-500 text-xs">驳回原因：{record.rejectReason}</div>}
              {record.checkinTime && <div className="text-xs text-gray-400">到访签到：{record.checkinTime}</div>}
              {record.signOutTime && <div className="text-xs text-gray-400">签离时间：{record.signOutTime}</div>}
            </div>

            {!record.canHandle && (
              <div className="mt-3 text-xs text-gray-400">该记录由你代录，审批/签到/签离需被访人本人操作。</div>
            )}

            {record.canHandle && record.status === 'expired' && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <Button
                  size="small"
                  fill="outline"
                  className="flex-1"
                  onClick={async () => {
                    const res = await revokeVisitor(record.id);
                    Toast.show({ content: res.success ? '已作废，临时卡已收回' : (res.msg || '作废失败'), position: 'center' });
                  }}
                >
                  作废并收回临时卡
                </Button>
              </div>
            )}

            {record.canHandle && (record.status === 'approved' || record.status === 'checkedin') && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <Button size="small" fill="outline" className="flex-1" onClick={() => setCredential(record)}>
                  <QrcodeOutlined /> 通行凭证
                </Button>
                {record.status === 'approved' ? (
                  <Button size="small" color="primary" className="flex-1" onClick={() => checkin(record)}>
                    <LoginOutlined /> 确认到访
                  </Button>
                ) : (
                  <Button size="small" fill="outline" color="danger" className="flex-1" onClick={() => signOut(record)}>
                    <CheckCircleOutlined /> 确认签离
                  </Button>
                )}
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
            {credential.visitToken ? (
              <div className="inline-block p-4 bg-white rounded-2xl border border-gray-100 shadow-inner">
                <QRCodeSVG value={credential.visitToken} size={180} level="H" />
              </div>
            ) : (
              <div className="py-6">
                <div className="text-sm text-gray-700">当前没有可用的二维码凭证</div>
                <div className="text-xs text-gray-500 mt-2 leading-5">
                  {credential.status === 'pending' && '预约还在审批中，审批通过后才会生成二维码凭证。'}
                  {credential.status === 'rejected' && '预约已被驳回，凭证不生成。'}
                  {credential.status === 'expired' && '已超过预约时段，凭证已失效；如需来访请重新预约。'}
                  {credential.status === 'completed' && '访客已签离，凭证已失效。'}
                  {(credential.status === 'approved' || credential.status === 'checkedin') && '凭证生成异常，请下拉刷新后重试；仍不行请联系管理员。'}
                </div>
              </div>
            )}
            {credential.cardNo && (
              <div className="text-xl font-bold font-mono mt-4">临时卡 {credential.cardNo}</div>
            )}
            {!credential.visitToken && credential.passCode && (
              <div className="text-sm text-gray-600 mt-3">预约码 <span className="font-mono font-bold">{credential.passCode}</span>（可报给前台核对）</div>
            )}
            {!credential.cardNo && (
              <div className="text-xs text-orange-600 mt-3">未分配临时卡（卡池为空），本次仅支持二维码核验</div>
            )}
            <div className="text-xs text-gray-500 mt-2">{credential.visitDate} {credential.visitTime} · {credential.department || '—'}</div>
            <div className="text-xs text-gray-400 mt-1">二维码仅在本时段内有效，可截图分享给访客；签离后立即失效。</div>
          </div>
        )}
        closeOnAction
        actions={[{ key: 'close', text: '关闭' }]}
        onClose={() => setCredential(null)}
      />

      <Modal
        visible={checkinTarget !== null}
        title="确认到访"
        content={
          <div>
            <div className="text-xs text-gray-500 mb-3 leading-5">
              该访客还没有临时卡，当前空闲 {cards.length} 张。默认不分配（只用二维码），需要刷闸机时再选卡。
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
            text: '确认到访',
            primary: true,
            onClick: () => {
              if (!checkinTarget) return;
              if (cardChoice === 'none') { void doCheckin(checkinTarget, '', true); return; }
              void doCheckin(checkinTarget, cardChoice, false);
            },
          },
        ]}
        onClose={() => setCheckinTarget(null)}
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
