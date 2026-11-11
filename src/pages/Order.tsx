import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Checkbox, Dialog, NavBar, Tabs, Toast } from 'antd-mobile';
import { CheckCircleOutlined, CoffeeOutlined, MinusOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useApp } from '../context/AppContext';
import { m } from '../lib/api';
import {
  formatMoney, makeId, isOrderableRepast, isDateOrderable,
  repastCanOrder, repastDeadlineTip, type RepastRule,
} from '../lib/utils';
import type { CartDish } from './Menu';
import type { MealOrder } from '../data/mock';

interface PackageMeal {
  value: string;
  repastNo: string;
  time: string;
  price: number;
  /** DC_Repast 订餐规则说明（Order_Days/End_Time） */
  tip: string;
}

interface OrderModeInfo {
  mode: string;
  modeText: string;
  payAtOrder: boolean;
  tip: string;
}

/** 一次提交请求：同一「用餐日期 + 餐别」为一张订单，便于后端按 DC_Repast 规则与份数逐单校验 */
interface OrderPayload {
  repastNo: string;
  areaNo: string;
  orderDate: string;
  items: { wareId: number; copies: number; price: number }[];
}

function readCart(): CartDish[] {
  try {
    return JSON.parse(window.sessionStorage.getItem('ylt-cart') || '[]') as CartDish[];
  } catch {
    return [];
  }
}

function pickupCode(): string {
  return `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 900 + 100)}`;
}

export default function Order(): React.JSX.Element {
  const [location, setLocation] = useLocation();
  const { account, mealOrders } = useApp();
  const query = new URLSearchParams(location.split('?')[1] || '');
  const [mode, setMode] = useState(query.get('mode') === 'package' ? 'package' : 'dishes');
  const [cart, setCart] = useState<CartDish[]>(readCart);
  const [selectedDates, setSelectedDates] = useState<string[]>([dayjs().add(1, 'day').format('YYYY-MM-DD')]);
  const [selectedMeals, setSelectedMeals] = useState<string[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [repastList, setRepastList] = useState<RepastRule[]>([]);
  const [orderMode, setOrderMode] = useState<OrderModeInfo>({
    mode: '0',
    modeText: '消费扣款',
    payAtOrder: false,
    tip: '消费扣款：提交订单不扣款，取餐时才从一卡通余额扣款。',
  });

  // 订餐模式来自后台 ST_SysParam(DC.Solution)：1=订餐扣款，0=消费扣款（取餐时扣）
  useEffect(() => {
    m.orderMode()
      .then((r: any) => {
        if (r && r.mode) setOrderMode({ mode: String(r.mode), modeText: r.modeText || '', payAtOrder: !!r.payAtOrder, tip: r.tip || '' });
      })
      .catch(() => {});
  }, []);

  // 按餐别订套餐的餐别与价格来自后台 SF_Repast（不再使用硬编码演示价）；
  // 起止均为 0 点的餐别不可预定，DC_Repast.Can_Order=0 的餐别未开放订餐，均不显示
  useEffect(() => {
    m.repasts()
      .then((rows: any) => {
        const arr = ((Array.isArray(rows) ? rows : []) as RepastRule[])
          .filter((r) => isOrderableRepast(r) && repastCanOrder(r));
        setRepastList(arr);
        setSelectedMeals((prev) => (prev.length === 0 && arr.length > 0 ? [arr[0].Repast_Name!] : prev));
      })
      .catch(() => {});
  }, []);

  const packageMeals: PackageMeal[] = useMemo(() => repastList.map((r) => ({
    value: r.Repast_Name || '',
    repastNo: r.Repast_No || '',
    time: `${r.Bgn_Time || ''}-${r.End_Time || ''}`,
    price: Number(r.Price || 0),
    tip: repastDeadlineTip(r),
  })), [repastList]);

  const repastOfLabel = (label: string): RepastRule | undefined => repastList.find((r) => r.Repast_Name === label);
  const repastNoOfLabel = (label: string): string => repastOfLabel(label)?.Repast_No || '';

  const dishTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const packageTotal = selectedDates.length * selectedMeals.reduce((sum, meal) => sum + (packageMeals.find((item) => item.value === meal)?.price || 0), 0);
  const total = mode === 'dishes' ? dishTotal : packageTotal;

  // 可选用餐日：从今天起 7 天，是否可选由 DC_Repast 的 Order_Days/End_Time 决定
  //（已勾选餐别中任意一个可选即可；未勾选时以全部可选餐别判断）
  const orderDates = useMemo(() => Array.from({ length: 7 }, (_, index) => dayjs().add(index, 'day')), []);
  const dateOptions = useMemo(() => orderDates.map((d) => {
    const value = d.format('YYYY-MM-DD');
    const pool = selectedMeals.length
      ? selectedMeals.map((meal) => repastOfLabel(meal)).filter(Boolean) as RepastRule[]
      : repastList;
    const orderable = pool.length === 0
      ? true
      : pool.some((r) => isDateOrderable(value, r));
    return { value, label: d.format('MM-DD'), week: ['日', '一', '二', '三', '四', '五', '六'][d.day()], orderable };
  }), [orderDates, repastList, selectedMeals]);

  // 餐别规则变化后，剔除已过订餐截止时间的日期；全被剔除时自动选中最早一个可订日期
  useEffect(() => {
    if (repastList.length === 0) return;
    const pool = (selectedMeals.length
      ? selectedMeals.map((meal) => repastOfLabel(meal)).filter(Boolean) as RepastRule[]
      : repastList);
    if (pool.length === 0) return;
    setSelectedDates((list) => {
      const kept = list.filter((d) => pool.some((r) => isDateOrderable(d, r)));
      if (kept.length > 0) return kept;
      const first = dateOptions.find((o) => o.orderable)?.value;
      return first ? [first] : [];
    });
    // 仅在餐别列表/已选餐别变化时重算，避免循环
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repastList, selectedMeals]);

  const changeCartQuantity = (target: CartDish, delta: number): void => {
    const next = cart.map((item) => {
      const same = item.id === target.id && item.date === target.date && item.canteen === target.canteen && item.meal === target.meal;
      return same ? { ...item, quantity: item.quantity + delta } : item;
    }).filter((item) => item.quantity > 0);
    setCart(next);
    window.sessionStorage.setItem('ylt-cart', JSON.stringify(next));
  };

  // 订餐扣款（payAtOrder）才需要在提交前校验余额；消费扣款取餐时才扣，不在此拦截
  const needBalanceCheck = orderMode.payAtOrder;

  // 是否有可提交的订餐内容（0 元套餐也算「有预定」，应允许提交）
  const hasItems = mode === 'dishes'
    ? cart.some((item) => item.quantity > 0)
    : selectedDates.length > 0 && selectedMeals.length > 0;

  /** 组装提交请求：同一「用餐日期 + 餐别」为一张订单 */
  const buildPayloads = (): OrderPayload[] => {
    if (mode === 'dishes') {
      const groups = new Map<string, CartDish[]>();
      cart.forEach((item) => {
        const key = `${item.date}|${item.meal}`;
        groups.set(key, [...(groups.get(key) || []), item]);
      });
      return Array.from(groups.values()).map((items) => ({
        repastNo: repastNoOfLabel(items[0].meal),
        areaNo: '',
        orderDate: items[0].date,
        items: items.map((item) => ({ wareId: Number(item.id) || 0, copies: item.quantity, price: item.price })),
      }));
    }
    return selectedDates.flatMap((date) => selectedMeals.map((meal) => ({
      repastNo: repastNoOfLabel(meal),
      areaNo: '',
      orderDate: date,
      items: [{ wareId: 0, copies: 1, price: packageMeals.find((p) => p.value === meal)?.price || 0 }],
    })));
  };

  const validate = (): boolean => {
    // 校验「是否有菜品/套餐」，而不是「金额是否大于 0」：合计 0 元但已选菜品/套餐时同样可提交
    if (!hasItems) {
      Toast.show({ content: mode === 'dishes' ? '请先选择菜品' : '请选择日期和餐别', position: 'center' });
      return false;
    }
    if (!agreed) {
      Toast.show({ content: '请阅读并同意订餐协议', position: 'center' });
      return false;
    }
    if (account.status !== 'normal') {
      Toast.show({ content: '账户状态异常，暂不能订餐', position: 'center' });
      return false;
    }
    if (needBalanceCheck && account.balance < total) {
      Toast.show({ content: '账户余额不足，请先充值', position: 'center' });
      return false;
    }
    const duplicated = mode === 'package'
      ? mealOrders.some((order) => order.status === 'ordered' && selectedDates.includes(order.date) && selectedMeals.includes(order.meal))
      : mealOrders.some((order) => order.status === 'ordered' && cart.some((item) => item.date === order.date && item.meal === order.meal && item.canteen === order.canteen));
    if (duplicated) {
      Toast.show({ content: '存在相同日期和餐别的已订订单，请勿重复订餐', position: 'center' });
      return false;
    }
    // DC_Repast 订餐规则：Can_Order / Order_Days / End_Time 截止时间，前端先拦一道，后端仍会再校验
    const payloads = buildPayloads();
    for (const payload of payloads) {
      const repast = repastList.find((r) => r.Repast_No === payload.repastNo);
      if (!repastCanOrder(repast)) {
        Toast.show({ content: `${repast?.Repast_Name || '该餐别'}未开放订餐`, position: 'center' });
        return false;
      }
      if (!isDateOrderable(payload.orderDate, repast)) {
        const dl = payload.orderDate;
        Toast.show({ content: `${dl} 已过订餐截止时间，无法预订`, position: 'center' });
        return false;
      }
    }
    return true;
  };

  const createOrders = (): MealOrder[] => {
    if (mode === 'dishes') {
      const groups = new Map<string, CartDish[]>();
      cart.forEach((item) => {
        const key = `${item.date}|${item.canteen}|${item.meal}`;
        groups.set(key, [...(groups.get(key) || []), item]);
      });
      return Array.from(groups.values()).map((items) => ({
        id: makeId('MO'),
        orderNo: makeId('O'),
        date: items[0].date,
        orderTime: dayjs().format('YYYY-MM-DD HH:mm'),
        canteen: items[0].canteen,
        meal: items[0].meal,
        repastNo: repastNoOfLabel(items[0].meal),
        amount: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        isWareOrder: true,
        copies: null,
        mode: orderMode.modeText,
        dishes: items.map((item) => ({
          wareId: Number(item.id) || 0, wareName: item.name, warePrice: item.price,
          copies: item.quantity, subtotal: item.price * item.quantity,
        })),
        status: 'ordered' as const,
        pickupCode: pickupCode(),
        pickupTime: `${items[0].date} ${items[0].meal}`,
        deadline: `${items[0].date} 10:30`,
      }));
    }
    return selectedDates.flatMap((date) => selectedMeals.map((meal) => {
      const meta = packageMeals.find((item) => item.value === meal);
      return {
        id: makeId('MO'),
        orderNo: makeId('O'),
        date,
        orderTime: dayjs().format('YYYY-MM-DD HH:mm'),
        canteen: '第一食堂',
        meal,
        repastNo: meta?.repastNo || '',
        amount: meta?.price || 0,
        isWareOrder: false,
        copies: 1,
        mode: orderMode.modeText,
        dishes: [],
        status: 'ordered' as const,
        pickupCode: pickupCode(),
        pickupTime: meta?.time || '',
        deadline: `${date} 10:30`,
      };
    }));
  };

  const submit = (): void => {
    if (!validate()) return;
    const orders = createOrders();
    // 逐单提交：后端按「用餐日期 + 餐别」校验 Can_Order/截止时间与剩余份数，
    // 顺序提交可让份数校验反映前面已成功的订单
    const payloads = buildPayloads();
    Dialog.confirm({
      title: needBalanceCheck ? '确认订餐扣款' : '确认订餐',
      content: (
        <div className="text-left text-sm space-y-2">
          <div className="flex justify-between"><span className="text-gray-500">订单数量</span><span>{orders.length} 笔</span></div>
          <div className="flex justify-between"><span className="text-gray-500">合计金额</span><span className="font-semibold text-orange-600">¥{formatMoney(total)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">订餐模式</span><span>{orderMode.modeText}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">扣款时机</span><span>{needBalanceCheck ? '下单即扣款' : '取餐时扣款'}</span></div>
          <div className="text-xs text-gray-400 pt-1">{orderMode.tip}</div>
        </div>
      ),
      confirmText: needBalanceCheck ? '确认支付' : '确认订餐',
      cancelText: '取消',
      onConfirm: async () => {
        setSubmitting(true);
        try {
          let submittedMode = orderMode.mode;
          for (const payload of payloads) {
            // eslint-disable-next-line no-await-in-loop
            const res = await m.order(payload);
            if (!res.success) {
              Toast.show({ content: res.msg || '订餐失败，请检查余额', position: 'center' });
              return;
            }
            submittedMode = String(res.mode ?? orderMode.mode);
          }
          window.sessionStorage.removeItem('ylt-cart');
          setCart([]);
          Toast.show({ content: `订餐成功（${submittedMode === '1' ? '订餐扣款' : '消费扣款'}）`, position: 'center' });
          setLocation('/my-orders');
        } catch {
          Toast.show({ content: '网络异常，请重试', position: 'center' });
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const insufficientBalance = needBalanceCheck && total > account.balance;

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar onBack={() => setLocation('/menu')} className="bg-white">在线订餐</NavBar>
      <Tabs activeKey={mode} onChange={setMode} className="bg-white">
        <Tabs.Tab title="按菜谱订餐" key="dishes" />
        <Tabs.Tab title="按餐别订餐" key="package" />
      </Tabs>

      <div className="p-4 space-y-4">
        <div className="rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-700 leading-5">
          <span className="font-semibold">{orderMode.modeText}</span>：{orderMode.tip}
        </div>

        {mode === 'dishes' ? (
          <Card className="!rounded-2xl !border !border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">购物车明细</h2>
              <Button size="mini" fill="outline" onClick={() => setLocation('/menu')}>继续选菜</Button>
            </div>
            {cart.length > 0 ? (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={`${item.date}-${item.canteen}-${item.meal}-${item.id}`} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center"><CoffeeOutlined /></div>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-400 mt-1">{item.date} · {item.meal} · {item.canteen}</div>
                        <div className="text-xs text-orange-600 mt-1">¥{formatMoney(item.price)} / 份</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center" onClick={() => changeCartQuantity(item, -1)}><MinusOutlined /></button>
                      <span className="w-5 text-center font-semibold">{item.quantity}</span>
                      <button className="w-7 h-7 rounded-full bg-[#0064E6] text-white flex items-center justify-center" onClick={() => changeCartQuantity(item, 1)}><PlusOutlined /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CoffeeOutlined className="text-5xl text-gray-300" />
                <div className="text-gray-500 mt-3">购物车为空</div>
                <Button color="primary" fill="outline" className="mt-4" onClick={() => setLocation('/menu')}>去选择菜品</Button>
              </div>
            )}
          </Card>
        ) : (
          <>
            <Card className="!rounded-2xl !border !border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-4">选择用餐日期</h2>
              <div className="grid grid-cols-4 gap-2">
                {dateOptions.map((opt) => {
                  const checked = selectedDates.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      disabled={!opt.orderable}
                      className={`h-14 rounded-2xl text-sm ${
                        checked ? 'bg-[#0064E6] text-white font-semibold'
                          : opt.orderable ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-300'
                      }`}
                      onClick={() => setSelectedDates((list) => checked ? list.filter((item) => item !== opt.value) : [...list, opt.value].sort())}
                    >
                      <div className="text-xs">{opt.week}</div>
                      <div>{opt.label}</div>
                    </button>
                  );
                })}
              </div>
              {/* DC_Repast 订餐规则：Order_Days 需提前预定天数 + End_Time 截止时间 */}
              {packageMeals.filter((m2) => selectedMeals.includes(m2.value) && m2.tip).length > 0 && (
                <div className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-700 leading-5">
                  {packageMeals.filter((m2) => selectedMeals.includes(m2.value) && m2.tip).map((m2) => (
                    <div key={m2.repastNo}>{m2.value}：{m2.tip}</div>
                  ))}
                  <div className="text-blue-500">灰色日期为已过截止时间，不可选择。</div>
                </div>
              )}
            </Card>
            <Card className="!rounded-2xl !border !border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-4">勾选餐别</h2>
              {packageMeals.length === 0 ? (
                <div className="text-center text-gray-400 py-6 text-sm">暂无可订餐别</div>
              ) : (
                <div className="space-y-3">
                  {packageMeals.map((meal) => {
                    const checked = selectedMeals.includes(meal.value);
                    return (
                      <button
                        key={meal.repastNo}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border ${checked ? 'border-[#0064E6] bg-blue-50' : 'border-gray-200 bg-white'}`}
                        onClick={() => setSelectedMeals((list) => checked ? list.filter((item) => item !== meal.value) : [...list, meal.value])}
                      >
                        <span className="flex items-center gap-3 text-left">
                          <Checkbox checked={checked} />
                          <span>
                            <span className="block font-semibold text-gray-900">{meal.value} · 标准套餐</span>
                            <span className="text-xs text-gray-400">{meal.time}</span>
                            {meal.tip && <span className="block text-xs text-blue-500 mt-0.5">{meal.tip}</span>}
                          </span>
                        </span>
                        <span className="font-semibold text-orange-600 font-mono">¥{formatMoney(meal.price)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </>
        )}

        <Card className="!rounded-2xl !border !border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">扣款确认</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">订餐明细</span><span>{mode === 'dishes' ? `${cart.length} 个菜品` : `${selectedDates.length} 天 × ${selectedMeals.length} 餐`}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">订餐模式</span><span>{orderMode.modeText}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">账户余额</span><span className="font-mono">¥{formatMoney(account.balance)}</span></div>
            <div className="flex justify-between pt-3 border-t border-gray-100"><span className="font-semibold">合计金额</span><span className="text-orange-600 text-xl font-bold font-mono">¥{formatMoney(total)}</span></div>
          </div>
          {needBalanceCheck
            ? insufficientBalance && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-500">余额不足，请先完成充值后再提交。</div>
            : <div className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-xs text-orange-500">消费扣款模式：当前提交不扣款，取餐时将自动从余额扣款。</div>}
        </Card>

        <div className="flex items-start gap-2">
          <Checkbox checked={agreed} onChange={setAgreed} />
          <span className="text-xs text-gray-500 leading-5">
            我已阅读并同意
            <span
              className="text-[#0064E6] underline mx-0.5"
              onClick={() => setLocation('/agreement?tab=order')}
            >
              《订餐服务协议》
            </span>
            ，提交后按订餐截止时间、库存、余额及重复订餐规则校验。
          </span>
        </div>

        <Button block color="primary" size="large" loading={submitting} className="!rounded-full !h-12" onClick={submit} disabled={!hasItems || account.status !== 'normal' || insufficientBalance}>
          <CheckCircleOutlined className="mr-2" />
          {needBalanceCheck ? `确认支付 ¥${formatMoney(total)}` : `确认订餐 ¥${formatMoney(total)}`}
        </Button>
      </div>
    </div>
  );
}