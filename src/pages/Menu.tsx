import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Badge, Button, Card, Empty, NavBar, Tabs, Tag, Toast } from 'antd-mobile';
import { CoffeeOutlined, MinusOutlined, PlusOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { m } from '../lib/api';
import {
  isOrderableRepast, isDateOrderable, repastCanOrder, repastDeadlineTip,
  type RepastRule,
} from '../lib/utils';

interface Dish {
  id: string;
  name: string;
  price: number;
  tag: string;
  taste: string;
  window: string;
  /** 剩余份数，-1 表示不限量 */
  stock: number;
  /** 已预定份数 */
  ordered: number;
}

export interface CartDish extends Dish {
  quantity: number;
  date: string;
  canteen: string;
  meal: string;
}

//订餐只能针对「今天及以后」的用餐日，具体是否可订由 DC_Repast 的 Order_Days/End_Time 决定
const dates = Array.from({ length: 7 }, (_, index) => dayjs().add(index, 'day'));

function readCart(): CartDish[] {
  try {
    return JSON.parse(window.sessionStorage.getItem('ylt-cart') || '[]') as CartDish[];
  } catch {
    return [];
  }
}

export default function Menu(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [canteen, setCanteen] = useState('');
  const [repastNo, setRepastNo] = useState('');
  const [areaList, setAreaList] = useState<any[]>([]);
  const [repastList, setRepastList] = useState<RepastRule[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [cart, setCart] = useState<CartDish[]>(readCart);
  const [loading, setLoading] = useState(false);
  const [orderTip, setOrderTip] = useState('');

  // Ware_Week 周一=1..周日=7
  const week = useMemo(() => ((dayjs(selectedDate).day() + 6) % 7) + 1, [selectedDate]);

  // 餐别页签来自后台 SF_Repast（含真实名称与供应时段）；Can_Order=0 的餐别不开放订餐，不显示
  const meals = useMemo(() => repastList.map((r) => ({
    key: r.Repast_No,
    label: r.Repast_Name || '',
    time: `${r.Bgn_Time || ''}-${r.End_Time || ''}`,
  })), [repastList]);

  const currentMeal = useMemo(() => meals.find((m2) => m2.key === repastNo), [meals, repastNo]);
  const currentRepast = useMemo(() => repastList.find((r) => r.Repast_No === repastNo), [repastList, repastNo]);

  // 当前日期在该餐别下是否还能订（DC_Repast：Can_Order / Order_Days / End_Time）
  const dateOrderable = useMemo(() => isDateOrderable(selectedDate, currentRepast), [selectedDate, currentRepast]);

  const areaNo = useMemo(() => {
    const a = areaList.find((x) => x.Area_Name === canteen);
    return a ? a.Area_No : '';
  }, [areaList, canteen]);

  // 加载食堂与餐别元数据（XF_Area / SF_Repast）；开始/结束时间均为 0 点或未开放订餐的餐别不显示
  useEffect(() => {
    Promise.all([
      m.areas().catch(() => []),
      m.repasts().catch(() => []),
    ]).then(([areas, repasts]) => {
      const areaArr = Array.isArray(areas) ? areas : [];
      // 过滤：起止时间均为 0 点的餐别不可预定；DC_Repast.Can_Order=0 的餐别不开放订餐
      const repastArr = (Array.isArray(repasts) ? repasts : [] as RepastRule[])
        .filter((r) => isOrderableRepast(r) && repastCanOrder(r));
      setAreaList(areaArr);
      setRepastList(repastArr);
      if (areaArr.length > 0) setCanteen((prev) => prev || areaArr[0].Area_Name);
      if (repastArr.length > 0) {
        setRepastNo((prev) => (repastArr.some((r) => r.Repast_No === prev) ? prev : repastArr[0].Repast_No));
      } else {
        setRepastNo('');
      }
    });
  }, []);

  // 拉取当前（星期, 餐别, 食堂）菜品；后台无数据即空列表，不使用任何演示菜品
  useEffect(() => {
    if (!repastNo) {
      setDishes([]);
      return;
    }
    setLoading(true);
    m.menu(week, repastNo, areaNo, selectedDate)
      .then((rows: any) => {
        setOrderTip((Array.isArray(rows) && rows[0]?.orderTip) || '');
        setDishes(Array.isArray(rows) ? rows.map((r: any) => ({
          id: String(r.wareId),
          name: r.wareName || '',
          price: Number(r.price || 0),
          tag: r.typeName || '',
          taste: r.remark || '',
          window: '',
          // 剩余份数 = Order_Copies − 已预定份数；后端返回 -1 表示不限量
          stock: r.remainCopies == null ? -1 : Number(r.remainCopies),
          ordered: Number(r.orderedCopies || 0),
        })) : []);
      })
      .catch(() => setDishes([]))
      .finally(() => setLoading(false));
  }, [week, repastNo, areaNo, selectedDate]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const mealLabel = currentMeal?.label || '';

  // 当前日期已过订餐截止时间时，自动切到最近一个可订日期
  useEffect(() => {
    if (!currentRepast || isDateOrderable(selectedDate, currentRepast)) return;
    const next = dates.map((d) => d.format('YYYY-MM-DD')).find((v) => isDateOrderable(v, currentRepast));
    if (next) setSelectedDate(next);
  }, [selectedDate, currentRepast]);

  const persistCart = (next: CartDish[]): void => {
    setCart(next);
    window.sessionStorage.setItem('ylt-cart', JSON.stringify(next));
  };

  const changeQuantity = (dish: Dish, delta: number): void => {
    if (!dateOrderable) {
      Toast.show({ content: orderTip || '该日期已过订餐截止时间', position: 'center' });
      return;
    }
    const key = `${selectedDate}-${canteen}-${mealLabel}-${dish.id}`;
    const existingIndex = cart.findIndex((item) => `${item.date}-${item.canteen}-${item.meal}-${item.id}` === key);
    if (existingIndex >= 0) {
      const next = [...cart];
      const quantity = next[existingIndex].quantity + delta;
      if (quantity <= 0) next.splice(existingIndex, 1);
      else next[existingIndex] = { ...next[existingIndex], quantity };
      persistCart(next);
      return;
    }
    if (delta <= 0) return;
    // 剩余份数校验：stock = -1 表示不限量
    if (dish.stock === 0) {
      Toast.show({ content: '该菜品已订完', position: 'center' });
      return;
    }
    persistCart([...cart, { ...dish, quantity: 1, date: selectedDate, canteen, meal: mealLabel }]);
  };

  const getQuantity = (dishId: string): number => cart.find((item) =>
    item.id === dishId && item.date === selectedDate && item.canteen === canteen && item.meal === mealLabel,
  )?.quantity || 0;

  const checkout = (): void => {
    if (cart.length === 0) {
      Toast.show({ content: '请先选择菜品', position: 'center' });
      return;
    }
    setLocation('/order?mode=dishes');
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-24">
      <NavBar
        onBack={() => setLocation('/')}
        className="bg-white"
        right={<Badge content={cartCount > 0 ? cartCount : null}><ShoppingCartOutlined className="text-xl" /></Badge>}
      >
        每日菜谱
      </NavBar>

      <div className="bg-white border-b border-gray-100">
        <div className="px-4 py-3 flex gap-2 overflow-x-auto">
          {dates.map((date) => {
            const value = date.format('YYYY-MM-DD');
            // 该日期在当前餐别下是否还能订（DC_Repast.Order_Days/End_Time 规则）
            const enabled = isDateOrderable(value, currentRepast);
            return (
              <button
                key={value}
                disabled={!enabled}
                className={`flex-shrink-0 w-16 h-14 rounded-2xl flex flex-col items-center justify-center ${
                  selectedDate === value
                    ? 'bg-[#0064E6] text-white'
                    : enabled ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-300'
                }`}
                onClick={() => setSelectedDate(value)}
              >
                <span className="text-xs">{date.format('ddd')}</span>
                <span className="font-semibold mt-1">{date.format('MM-DD')}</span>
              </button>
            );
          })}
        </div>
        {areaList.length > 0 && (
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
            {areaList.map((a) => (
              <Button key={a.Area_No} size="mini" className={canteen === a.Area_Name ? '!bg-blue-50 !text-[#0064E6] !border-[#0064E6]' : '!bg-gray-100 !border-0 !text-gray-600'} onClick={() => setCanteen(a.Area_Name)}>
                {a.Area_Name}
              </Button>
            ))}
          </div>
        )}
        {meals.length > 0 && (
          <Tabs activeKey={repastNo} onChange={setRepastNo}>
            {meals.map((item) => <Tabs.Tab title={item.label} key={item.key} />)}
          </Tabs>
        )}
      </div>

      <div className="px-4 py-4">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-semibold text-gray-900">
            {areaList.length > 1 && canteen ? `${canteen} · ` : ''}{mealLabel || '餐别'}
          </span>
          <span className="text-xs text-gray-400">供应时间 {currentMeal?.time || '—'}</span>
        </div>

        {/* 订餐规则提示：DC_Repast.Order_Days 需提前预定天数 + End_Time 截止时间 */}
        {repastDeadlineTip(currentRepast) && (
          <div className={`mb-3 rounded-xl px-3 py-2 text-xs leading-5 ${dateOrderable ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-600'}`}>
            {repastDeadlineTip(currentRepast)}
            {!dateOrderable && '（该日期已过截止时间，不可选）'}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-400 py-20">正在加载菜谱…</div>
        ) : meals.length === 0 ? (
          <Empty description="暂无可订餐别" className="mt-16" />
        ) : dishes.length === 0 ? (
          <Empty description="该日期/餐别暂无菜谱，可切换其他日期或餐别查看" className="mt-16" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {dishes.map((dish) => {
              const quantity = getQuantity(dish.id);
              // stock = -1 表示不限量；达到剩余份数上限时禁用加号
              const unlimited = dish.stock < 0;
              const soldOut = !unlimited && dish.stock <= quantity;
              const disabled = !dateOrderable || soldOut;
              return (
                <Card key={dish.id} className={`!rounded-2xl !border !border-gray-100 !p-3 ${disabled ? 'opacity-60' : ''}`}>
                  <div className="h-20 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center mb-3">
                    <div className="w-12 h-12 rounded-full bg-white text-orange-500 flex items-center justify-center text-xl shadow-sm">
                      <CoffeeOutlined />
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-gray-900">{dish.name}</div>
                      {/* 剩余份数 = 总份数 − 已预定份数（后端 XF_WareInWeek.Order_Copies 扣减订单明细） */}
                      <div className={`text-xs mt-1 ${soldOut ? 'text-red-500' : 'text-gray-400'}`}>
                        {unlimited ? '余量充足' : soldOut ? '已订完' : `余 ${dish.stock} 份`}
                        {!unlimited && dish.ordered > 0 && `（已预定 ${dish.ordered} 份）`}
                      </div>
                    </div>
                    {dish.tag && <Tag color={dish.tag === '素菜' ? 'success' : dish.tag === '荤菜' ? 'danger' : 'warning'}>{dish.tag}</Tag>}
                  </div>
                  {dish.taste && <div className="text-xs text-gray-500 mt-2">{dish.taste}</div>}
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-orange-600 font-bold font-mono">¥{dish.price}</div>
                    <div className="flex items-center gap-2">
                      {quantity > 0 && (
                        <>
                          <button className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center" onClick={() => changeQuantity(dish, -1)}><MinusOutlined /></button>
                          <span className="w-5 text-center font-semibold">{quantity}</span>
                        </>
                      )}
                      <button
                        disabled={disabled}
                        className={`w-7 h-7 rounded-full flex items-center justify-center ${disabled ? 'bg-gray-200 text-gray-400' : 'bg-[#0064E6] text-white'}`}
                        onClick={() => changeQuantity(dish, 1)}
                      >
                        <PlusOutlined />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <div className="max-w-screen-sm mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge content={cartCount}>
                <div className="w-11 h-11 bg-[#0064E6] rounded-full flex items-center justify-center text-white text-xl">
                  <ShoppingCartOutlined />
                </div>
              </Badge>
              <div>
                <div className="text-lg font-bold font-mono text-gray-900">¥{total.toFixed(2)}</div>
                <div className="text-xs text-gray-400">跨日期/餐别可合并结算</div>
              </div>
            </div>
            <Button color="primary" className="!rounded-full !px-6" onClick={checkout}>去结算</Button>
          </div>
        </div>
      )}
    </div>
  );
}