import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Dialog, Empty, Modal, NavBar, PullToRefresh, Tabs, Tag, Toast } from 'antd-mobile';
import { CoffeeOutlined, QrcodeOutlined } from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import dayjs from 'dayjs';
import { useApp } from '../context/AppContext';
import type { MealOrder } from '../data/mock';
import { formatMoney } from '../lib/utils';
import { m } from '../lib/api';
import { mapMealOrder } from '../lib/orderMap';
import TimeRangeFilter, { type TimeRange } from '../components/TimeRangeFilter';

const statusMap = {
  ordered: { color: 'primary', text: '已订餐' },
  picked: { color: 'success', text: '已取餐' },
  refunded: { color: 'danger', text: '已退订' },
  cancelled: { color: 'default', text: '已取消' },
  expired: { color: 'default', text: '已过期' },
} as const;

/** 查询维度：按「用餐日期」查（待用餐视图）还是按「下单时间」查（历史视图） */
type OrderScope = 'meal' | 'order';

/** 不同维度下的快捷时间范围 */
const scopeOptions: Record<OrderScope, { value: TimeRange; label: string }[]> = {
  // 用餐日期口径：默认「今天起」= 待用餐
  meal: [
    { value: 'future', label: '今天起' },
    { value: 'today', label: '今天' },
    { value: 'next7d', label: '未来7天' },
    { value: 'custom', label: '自定义' },
  ],
  // 下单时间口径：历史订餐行为
  order: [
    { value: 'today', label: '今天' },
    { value: '7d', label: '近7天' },
    { value: '30d', label: '近30天' },
    { value: 'custom', label: '自定义' },
  ],
};

export default function MyOrders(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { cancelMealOrder } = useApp();
  const [records, setRecords] = useState<MealOrder[]>([]);
  const [status, setStatus] = useState('all');
  // 默认按「用餐日期」查询今天及以后（待用餐）；切到「下单时间」可查历史
  const [scope, setScope] = useState<OrderScope>('meal');
  const [range, setRange] = useState<TimeRange>('future');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [qrOrder, setQrOrder] = useState<MealOrder | null>(null);
  const [detail, setDetail] = useState<MealOrder | null>(null);
  // loading：请求中；error：请求失败（可重试）；两者皆 false 且无数据即"无记录"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 时间范围 → 后端查询区间
  // 用餐日期口径传 byMealDate=true，end 传空表示不限上限（今天起）
  const rangeBounds = useCallback((): { bgn: string; end: string; byMealDate: boolean } => {
    const now = dayjs();
    const today = now.format('YYYY-MM-DD');
    if (scope === 'meal') {
      if (range === 'today') return { bgn: today, end: today, byMealDate: true };
      if (range === 'next7d') return { bgn: today, end: now.add(7, 'day').format('YYYY-MM-DD'), byMealDate: true };
      if (range === 'custom') return { bgn: start || today, end: end || '', byMealDate: true };
      // future：今天起，不限上限
      return { bgn: today, end: '', byMealDate: true };
    }
    if (range === 'today') return { bgn: today, end: today, byMealDate: false };
    if (range === '7d') return { bgn: now.subtract(7, 'day').format('YYYY-MM-DD'), end: today, byMealDate: false };
    if (range === '30d') return { bgn: now.subtract(30, 'day').format('YYYY-MM-DD'), end: today, byMealDate: false };
    return { bgn: start || now.subtract(30, 'day').format('YYYY-MM-DD'), end: end || today, byMealDate: false };
  }, [end, range, scope, start]);

  // 按所选时间段查询（区间在服务端过滤）；本页自持数据，避免与全局状态互相覆盖
  const load = useCallback(async (): Promise<boolean> => {
    const { bgn, end: to, byMealDate } = rangeBounds();
    setLoading(true);
    setError('');
    try {
      const rows = await m.myOrders(bgn, to, byMealDate);
      setRecords(Array.isArray(rows) ? rows.map(mapMealOrder) : []);
      return true;
    } catch {
      setRecords([]);
      setError('订餐记录加载失败，请检查网络后重试');
      return false;
    } finally {
      setLoading(false);
    }
  }, [rangeBounds]);

  useEffect(() => {
    load();
  }, [load]);

  // 切换维度时，把时间范围重置为该维度的默认值
  const changeScope = (next: OrderScope): void => {
    if (next === scope) return;
    setScope(next);
    setRange(next === 'meal' ? 'future' : '30d');
    setStart('');
    setEnd('');
  };

  const filtered = useMemo(() => records.filter((order) => {
    // "已退订"同时归集两类终态：订餐扣款模式确实退款，消费扣款模式仅取消订单
    if (status === 'refunded') return order.status === 'refunded' || order.status === 'cancelled';
    return status === 'all' || order.status === status;
  }), [records, status]);

  const canCancel = (order: MealOrder): boolean => order.status === 'ordered';

  // 消费扣款模式退订时并未扣款，不应标注为"已退订"
  const statusTag = (order: MealOrder): { color: string; text: string } => {
    if (order.status === 'cancelled') return { color: 'default', text: '已取消' };
    if (order.status === 'refunded') {
      return order.mode === '消费扣款'
        ? { color: 'default', text: '已取消' }
        : { color: 'danger', text: '已退订' };
    }
    return statusMap[order.status];
  };

  const refresh = async (): Promise<void> => {
    await load();
    Toast.show({ content: '订餐记录已刷新', position: 'center' });
  };

  const handleCancel = (order: MealOrder): void => {
    if (!canCancel(order)) {
      Toast.show({ content: '已超过退订截止时间，无法退订', position: 'center' });
      return;
    }
    Dialog.confirm({
      title: '确认退订',
      content: order.mode === '消费扣款'
        ? '当前为消费扣款模式，订餐时未扣款，退订后无退款。'
        : `退订后 ¥${formatMoney(order.amount)} 将原路退回一卡通余额。`,
      confirmText: '确认退订',
      cancelText: '取消',
      onConfirm: () => {
        cancelMealOrder(order).then(() => {
          // 退订后重新拉取当前区间的记录，保证状态与后台一致
          load();
          Toast.show({
            content: order.mode === '消费扣款' ? '订餐已取消' : '已退订，退款已退回余额',
            position: 'center',
          });
        }).catch((error) => {
          Toast.show({ content: error instanceof Error ? error.message : '退订失败', position: 'center' });
        });
      },
    });
  };

  const dishLine = (order: MealOrder): string => {
    if (!order.isWareOrder) return `${order.meal}标准套餐 ×${order.copies || 1}`;
    if (order.dishes.length === 0) return '套餐';
    return order.dishes.map((dish) => `${dish.wareName} ×${dish.copies}`).join('、');
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar
        onBack={() => setLocation('/')}
        className="bg-white"
        right={<Button size="small" color="primary" onClick={() => setLocation('/order')}>去订餐</Button>}
      >
        订餐记录
      </NavBar>
      {/* 查询维度切换：按用餐日期（待用餐）/ 按下单时间（历史） */}
      <div className="bg-white border-b border-gray-100 px-4 pt-3">
        <div className="inline-flex p-1 rounded-full bg-gray-100 gap-1">
          {([
            { key: 'meal', label: '按用餐日期' },
            { key: 'order', label: '按下单时间' },
          ] as { key: OrderScope; label: string }[]).map((item) => (
            <button
              key={item.key}
              className={`px-4 h-8 rounded-full text-sm transition ${scope === item.key ? 'bg-white text-[#0064E6] font-semibold shadow-sm' : 'text-gray-500'}`}
              onClick={() => changeScope(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <TimeRangeFilter
        range={range}
        start={start}
        end={end}
        options={scopeOptions[scope]}
        onRangeChange={setRange}
        onStartChange={setStart}
        onEndChange={setEnd}
      />
      <Tabs activeKey={status} onChange={setStatus} className="bg-white">
        <Tabs.Tab title="全部" key="all" />
        <Tabs.Tab title="已订餐" key="ordered" />
        <Tabs.Tab title="已取餐" key="picked" />
        <Tabs.Tab title="已退订" key="refunded" />
      </Tabs>

      <PullToRefresh onRefresh={refresh}>
        <div className="p-4 pb-6 space-y-3">
          {loading ? (
            <div className="text-center text-gray-400 py-20">正在加载订餐记录…</div>
          ) : error ? (
            <div className="text-center py-20">
              <CoffeeOutlined className="text-5xl text-gray-300" />
              <div className="text-gray-500 mt-3">{error}</div>
              <Button color="primary" className="mt-4" onClick={() => { load(); }}>重新加载</Button>
            </div>
          ) : filtered.length > 0 ? filtered.map((order) => (
            <Card key={order.id} className="!rounded-2xl !border !border-gray-100">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0"><CoffeeOutlined /></div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{order.meal}</div>
                    <div className="text-xs text-gray-400 mt-1">订餐日期 {order.date || '—'}</div>
                  </div>
                </div>
                <Tag color={statusTag(order).color} className="!m-0">{statusTag(order).text}</Tag>
              </div>

              <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600 leading-6">
                <div>{dishLine(order)}</div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400 mt-3">
                <span>{order.mode}{order.orderTime ? ` · 下单 ${order.orderTime}` : ''}</span>
                <span className="text-orange-600 text-sm font-bold font-mono">¥{formatMoney(order.amount)}</span>
              </div>

              <div className="flex items-center justify-end gap-2 mt-3">
                <Button size="mini" fill="outline" onClick={() => setDetail(order)}>明细</Button>
                {order.status === 'ordered' && (
                  <>
                    <Button size="mini" fill="outline" onClick={() => setQrOrder(order)}>
                      <QrcodeOutlined /> 取餐凭证
                    </Button>
                    <Button size="mini" fill="outline" color={canCancel(order) ? 'danger' : 'default'} onClick={() => handleCancel(order)}>
                      退订
                    </Button>
                  </>
                )}
              </div>
              {(order.status === 'refunded' || order.status === 'cancelled') && (
                <div className={`mt-3 text-xs ${order.mode === '消费扣款' ? 'text-gray-500' : 'text-green-600'}`}>
                  {order.mode === '消费扣款' ? '订单已取消，订餐时未扣款，无退款' : '退款已原路退回一卡通余额'}
                </div>
              )}
            </Card>
          )) : (
            <div className="mt-20">
              <Empty
                image={<CoffeeOutlined className="text-6xl text-gray-300" />}
                description={scope === 'meal' ? '今天及以后暂无订餐记录' : '所选时间段暂无订餐记录'}
              />
              <div className="text-center mt-4"><Button color="primary" onClick={() => setLocation('/order')}>去订餐</Button></div>
            </div>
          )}
        </div>
      </PullToRefresh>

      <Modal
        visible={detail !== null}
        title="订餐明细"
        content={detail && (
          <div className="text-left text-sm space-y-3">
            <div className="flex justify-between"><span className="text-gray-500">订单号</span><span className="text-xs break-all text-right">{detail.orderNo}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">订餐日期</span><span>{detail.date || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">操作时间</span><span>{detail.orderTime || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">餐别</span><span>{detail.meal || '—'}{detail.repastNo ? `（${detail.repastNo}）` : ''}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">订餐方式</span><span>{detail.isWareOrder ? '按菜品订餐' : '按餐别订套餐'}</span></div>
            {!detail.isWareOrder && (
              <div className="flex justify-between"><span className="text-gray-500">预定份数</span><span>{detail.copies ?? '—'}</span></div>
            )}
            <div className="flex justify-between"><span className="text-gray-500">扣款模式</span><span>{detail.mode}</span></div>
            <div className="pt-2 border-t border-gray-100">
              <div className="text-gray-500 mb-2">菜品明细</div>
              {detail.dishes.length > 0 ? detail.dishes.map((dish) => (
                <div key={dish.wareId} className="flex justify-between py-1">
                  <span className="text-gray-700">{dish.wareName} ×{dish.copies}</span>
                  <span className="font-mono text-gray-500">¥{formatMoney(dish.subtotal)}</span>
                </div>
              )) : (
                <div className="text-gray-400">{detail.meal}标准套餐 ×{detail.copies || 1}</div>
              )}
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-100">
              <span className="font-semibold">订餐总金额</span>
              <span className="text-orange-600 font-bold font-mono">¥{formatMoney(detail.amount)}</span>
            </div>
          </div>
        )}
        closeOnAction
        actions={[{ key: 'close', text: '关闭' }]}
        onClose={() => setDetail(null)}
      />

      <Modal
        visible={qrOrder !== null}
        title="取餐凭证"
        content={qrOrder && (
          <div className="text-center">
            <div className="inline-block p-4 bg-white rounded-2xl border border-gray-100 shadow-inner">
              <QRCodeSVG value={`${qrOrder.orderNo}|${qrOrder.pickupCode}`} size={180} level="H" />
            </div>
            <div className="text-2xl font-bold font-mono mt-4">{qrOrder.pickupCode}</div>
            <div className="text-xs text-gray-500 mt-2">{qrOrder.date} {qrOrder.pickupTime}</div>
            <div className="text-xs text-gray-400 mt-1">取餐时由食堂终端扫码核销</div>
          </div>
        )}
        closeOnAction
        actions={[{ key: 'close', text: '关闭' }]}
        onClose={() => setQrOrder(null)}
      />
    </div>
  );
}