import React, { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Checkbox, Dialog, NavBar, Tabs, Toast } from 'antd-mobile';
import { CheckCircleOutlined, CoffeeOutlined, MinusOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useApp } from '../context/AppContext';
import { formatMoney, makeId } from '../lib/utils';
import type { CartDish } from './Menu';
import type { MealOrder } from '../data/mock';

const packageMeals = [
  { value: '早餐', time: '07:00-09:00', price: 10 },
  { value: '午餐', time: '11:30-13:30', price: 20 },
  { value: '晚餐', time: '17:30-19:30', price: 18 },
  { value: '夜宵', time: '21:00-23:00', price: 15 },
];

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
  const { account, mealOrders, deduct, addMealOrder } = useApp();
  const query = new URLSearchParams(location.split('?')[1] || '');
  const [mode, setMode] = useState(query.get('mode') === 'package' ? 'package' : 'dishes');
  const [cart, setCart] = useState<CartDish[]>(readCart);
  const [selectedDates, setSelectedDates] = useState<string[]>([dayjs().add(1, 'day').format('YYYY-MM-DD')]);
  const [selectedMeals, setSelectedMeals] = useState<string[]>(['午餐']);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const dishTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const packageTotal = selectedDates.length * selectedMeals.reduce((sum, meal) => sum + (packageMeals.find((item) => item.value === meal)?.price || 0), 0);
  const total = mode === 'dishes' ? dishTotal : packageTotal;
  const orderDates = useMemo(() => Array.from({ length: 5 }, (_, index) => dayjs().add(index + 1, 'day')), []);

  const changeCartQuantity = (target: CartDish, delta: number): void => {
    const next = cart.map((item) => {
      const same = item.id === target.id && item.date === target.date && item.canteen === target.canteen && item.meal === target.meal;
      return same ? { ...item, quantity: item.quantity + delta } : item;
    }).filter((item) => item.quantity > 0);
    setCart(next);
    window.sessionStorage.setItem('ylt-cart', JSON.stringify(next));
  };

  const validate = (): boolean => {
    if (total <= 0) {
      Toast.show({ content: mode === 'dishes' ? '请先选择菜品' : '请选择日期和餐别', position: 'center' });
      return false;
    }
    if (!agreed) {
      Toast.show({ content: '请阅读并同意订餐协议', position: 'center' });
      return false;
    }
    if (account.status !== 'normal') {
      Toast.show({ content: '账户状态异常，暂不能扣款', position: 'center' });
      return false;
    }
    if (account.balance < total) {
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
        canteen: items[0].canteen,
        meal: items[0].meal,
        items: items.map((item) => `${item.name} ×${item.quantity}`),
        amount: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        status: 'ordered',
        pickupCode: pickupCode(),
        pickupTime: items[0].meal === '早餐' ? '07:00-09:00' : items[0].meal === '晚餐' ? '17:30-19:30' : items[0].meal === '夜宵' ? '21:00-23:00' : '11:30-13:30',
        deadline: `${items[0].date} 10:30`,
      }));
    }
    return selectedDates.flatMap((date) => selectedMeals.map((meal) => {
      const meta = packageMeals.find((item) => item.value === meal)!;
      return {
        id: makeId('MO'),
        orderNo: makeId('O'),
        date,
        canteen: '第一食堂',
        meal,
        items: [`${meal}标准套餐 ×1`],
        amount: meta.price,
        status: 'ordered' as const,
        pickupCode: pickupCode(),
        pickupTime: meta.time,
        deadline: `${date} 10:30`,
      };
    }));
  };

  const submit = (): void => {
    if (!validate()) return;
    const orders = createOrders();
    Dialog.confirm({
      title: '确认订餐扣款',
      content: (
        <div className="text-left text-sm space-y-2">
          <div className="flex justify-between"><span className="text-gray-500">订单数量</span><span>{orders.length} 笔</span></div>
          <div className="flex justify-between"><span className="text-gray-500">合计金额</span><span className="font-semibold text-orange-600">¥{formatMoney(total)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">扣款账户</span><span>一卡通余额</span></div>
        </div>
      ),
      confirmText: '确认支付',
      cancelText: '取消',
      onConfirm: () => {
        setSubmitting(true);
        window.setTimeout(() => {
          if (!deduct(total)) {
            setSubmitting(false);
            Toast.show({ content: '扣款失败，请检查余额或账户状态', position: 'center' });
            return;
          }
          orders.forEach(addMealOrder);
          window.sessionStorage.removeItem('ylt-cart');
          setCart([]);
          setSubmitting(false);
          Toast.show({ content: '订餐成功，凭证已生成', position: 'center' });
          setLocation('/my-orders');
        }, 900);
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar onBack={() => setLocation('/menu')} className="bg-white">在线订餐</NavBar>
      <Tabs activeKey={mode} onChange={setMode} className="bg-white">
        <Tabs.Tab title="按菜谱订餐" key="dishes" />
        <Tabs.Tab title="按餐别订餐" key="package" />
      </Tabs>

      <div className="p-4 space-y-4">
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
              <h2 className="font-semibold text-gray-900 mb-4">选择日期范围</h2>
              <div className="grid grid-cols-5 gap-2">
                {orderDates.map((date) => {
                  const value = date.format('YYYY-MM-DD');
                  const checked = selectedDates.includes(value);
                  return (
                    <button
                      key={value}
                      className={`h-14 rounded-2xl text-sm ${checked ? 'bg-[#0064E6] text-white font-semibold' : 'bg-gray-100 text-gray-600'}`}
                      onClick={() => setSelectedDates((list) => checked ? list.filter((item) => item !== value) : [...list, value].sort())}
                    >
                      <div className="text-xs">{['日','一','二','三','四','五','六'][date.day()]}</div>
                      <div>{date.format('MM-DD')}</div>
                    </button>
                  );
                })}
              </div>
            </Card>
            <Card className="!rounded-2xl !border !border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-4">勾选餐别</h2>
              <div className="space-y-3">
                {packageMeals.map((meal) => {
                  const checked = selectedMeals.includes(meal.value);
                  return (
                    <button
                      key={meal.value}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border ${checked ? 'border-[#0064E6] bg-blue-50' : 'border-gray-200 bg-white'}`}
                      onClick={() => setSelectedMeals((list) => checked ? list.filter((item) => item !== meal.value) : [...list, meal.value])}
                    >
                      <span className="flex items-center gap-3 text-left">
                        <Checkbox checked={checked} />
                        <span><span className="block font-semibold text-gray-900">{meal.value} · 标准套餐</span><span className="text-xs text-gray-400">{meal.time}</span></span>
                      </span>
                      <span className="font-semibold text-orange-600 font-mono">¥{meal.price}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          </>
        )}

        <Card className="!rounded-2xl !border !border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">扣款确认</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">订餐明细</span><span>{mode === 'dishes' ? `${cart.length} 个菜品` : `${selectedDates.length} 天 × ${selectedMeals.length} 餐`}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">账户余额</span><span className="font-mono">¥{formatMoney(account.balance)}</span></div>
            <div className="flex justify-between pt-3 border-t border-gray-100"><span className="font-semibold">合计金额</span><span className="text-orange-600 text-xl font-bold font-mono">¥{formatMoney(total)}</span></div>
          </div>
          {total > account.balance && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-500">余额不足，请先完成充值后再提交。</div>}
        </Card>

        <div className="flex items-start gap-2">
          <Checkbox checked={agreed} onChange={setAgreed} />
          <span className="text-xs text-gray-500 leading-5">我已阅读并同意《订餐服务协议》，提交后按订餐截止时间、库存、余额及重复订餐规则校验。</span>
        </div>

        <Button block color="primary" size="large" loading={submitting} className="!rounded-full !h-12" onClick={submit} disabled={total <= 0 || account.status !== 'normal'}>
          <CheckCircleOutlined className="mr-2" />确认支付 ¥{formatMoney(total)}
        </Button>
      </div>
    </div>
  );
}
