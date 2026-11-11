import React, { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Badge, Button, Card, NavBar, Tabs, Tag, Toast } from 'antd-mobile';
import { CoffeeOutlined, MinusOutlined, PlusOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

interface Dish {
  id: string;
  name: string;
  price: number;
  tag: string;
  taste: string;
  window: string;
  stock: number;
}

export interface CartDish extends Dish {
  quantity: number;
  date: string;
  canteen: string;
  meal: string;
}

const mealMap: Record<string, { label: string; time: string; dishes: Dish[] }> = {
  breakfast: {
    label: '早餐',
    time: '07:00-09:00',
    dishes: [
      { id: 'B001', name: '现磨豆浆', price: 2, tag: '饮品', taste: '清淡', window: '1号窗口', stock: 30 },
      { id: 'B002', name: '鲜肉包', price: 3, tag: '主食', taste: '咸鲜', window: '2号窗口', stock: 20 },
      { id: 'B003', name: '水煮蛋', price: 2, tag: '副食', taste: '清淡', window: '2号窗口', stock: 26 },
      { id: 'B004', name: '小米粥', price: 3, tag: '主食', taste: '清淡', window: '1号窗口', stock: 18 },
    ],
  },
  lunch: {
    label: '午餐',
    time: '11:30-13:30',
    dishes: [
      { id: 'L001', name: '红烧肉', price: 12, tag: '荤菜', taste: '酱香', window: '3号窗口', stock: 12 },
      { id: 'L002', name: '清蒸鱼', price: 15, tag: '荤菜', taste: '清淡', window: '4号窗口', stock: 8 },
      { id: 'L003', name: '宫保鸡丁', price: 10, tag: '荤菜', taste: '微辣', window: '3号窗口', stock: 16 },
      { id: 'L004', name: '番茄炒蛋', price: 8, tag: '半荤', taste: '酸甜', window: '4号窗口', stock: 22 },
      { id: 'L005', name: '清炒时蔬', price: 6, tag: '素菜', taste: '清淡', window: '5号窗口', stock: 24 },
      { id: 'L006', name: '紫菜蛋花汤', price: 3, tag: '汤品', taste: '清淡', window: '5号窗口', stock: 30 },
    ],
  },
  dinner: {
    label: '晚餐',
    time: '17:30-19:30',
    dishes: [
      { id: 'D001', name: '糖醋排骨', price: 14, tag: '荤菜', taste: '酸甜', window: '3号窗口', stock: 10 },
      { id: 'D002', name: '麻婆豆腐', price: 8, tag: '半荤', taste: '麻辣', window: '4号窗口', stock: 18 },
      { id: 'D003', name: '凉拌黄瓜', price: 5, tag: '素菜', taste: '清爽', window: '5号窗口', stock: 16 },
      { id: 'D004', name: '冬瓜汤', price: 3, tag: '汤品', taste: '清淡', window: '5号窗口', stock: 20 },
    ],
  },
  night: {
    label: '夜宵',
    time: '21:00-23:00',
    dishes: [
      { id: 'N001', name: '阳春面', price: 8, tag: '主食', taste: '清淡', window: '6号窗口', stock: 20 },
      { id: 'N002', name: '煎饺', price: 10, tag: '主食', taste: '咸香', window: '6号窗口', stock: 12 },
    ],
  },
};

const canteens = ['第一食堂', '第二食堂', '教工餐厅'];
const dates = Array.from({ length: 7 }, (_, index) => dayjs().subtract(2, 'day').add(index, 'day'));

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
  const [canteen, setCanteen] = useState(canteens[0]);
  const [meal, setMeal] = useState('lunch');
  const [cart, setCart] = useState<CartDish[]>(readCart);

  const dishes = useMemo(() => mealMap[meal].dishes.map((dish) => ({
    ...dish,
    price: canteen === '教工餐厅' ? dish.price + 1 : dish.price,
  })), [canteen, meal]);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const persistCart = (next: CartDish[]): void => {
    setCart(next);
    window.sessionStorage.setItem('ylt-cart', JSON.stringify(next));
  };

  const changeQuantity = (dish: Dish, delta: number): void => {
    const key = `${selectedDate}-${canteen}-${meal}-${dish.id}`;
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
    if (dish.stock <= 0) {
      Toast.show({ content: '该菜品今日已订完', position: 'center' });
      return;
    }
    persistCart([...cart, { ...dish, quantity: 1, date: selectedDate, canteen, meal: mealMap[meal].label }]);
  };

  const getQuantity = (dishId: string): number => cart.find((item) =>
    item.id === dishId && item.date === selectedDate && item.canteen === canteen && item.meal === mealMap[meal].label,
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
            return (
              <button
                key={value}
                className={`flex-shrink-0 w-16 h-14 rounded-2xl flex flex-col items-center justify-center ${selectedDate === value ? 'bg-[#0064E6] text-white' : 'bg-gray-100 text-gray-600'}`}
                onClick={() => setSelectedDate(value)}
              >
                <span className="text-xs">{date.format('ddd')}</span>
                <span className="font-semibold mt-1">{date.format('MM-DD')}</span>
              </button>
            );
          })}
        </div>
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {canteens.map((item) => (
            <Button key={item} size="mini" className={canteen === item ? '!bg-blue-50 !text-[#0064E6] !border-[#0064E6]' : '!bg-gray-100 !border-0 !text-gray-600'} onClick={() => setCanteen(item)}>
              {item}
            </Button>
          ))}
        </div>
        <Tabs activeKey={meal} onChange={setMeal}>
          {Object.entries(mealMap).map(([key, value]) => <Tabs.Tab title={value.label} key={key} />)}
        </Tabs>
      </div>

      <div className="px-4 py-4">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-semibold text-gray-900">{canteen} · {mealMap[meal].label}</span>
          <span className="text-xs text-gray-400">供应时间 {mealMap[meal].time}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {dishes.map((dish) => {
            const quantity = getQuantity(dish.id);
            return (
              <Card key={dish.id} className="!rounded-2xl !border !border-gray-100 !p-3">
                <div className="h-20 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center mb-3">
                  <div className="w-12 h-12 rounded-full bg-white text-orange-500 flex items-center justify-center text-xl shadow-sm">
                    <CoffeeOutlined />
                  </div>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-gray-900">{dish.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{dish.window} · 余 {dish.stock} 份</div>
                  </div>
                  <Tag color={dish.tag === '素菜' ? 'success' : dish.tag === '荤菜' ? 'danger' : 'warning'}>{dish.tag}</Tag>
                </div>
                <div className="text-xs text-gray-500 mt-2">{dish.taste}</div>
                <div className="flex items-center justify-between mt-3">
                  <div className="text-orange-600 font-bold font-mono">¥{dish.price}</div>
                  <div className="flex items-center gap-2">
                    {quantity > 0 && (
                      <>
                        <button className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center" onClick={() => changeQuantity(dish, -1)}><MinusOutlined /></button>
                        <span className="w-5 text-center font-semibold">{quantity}</span>
                      </>
                    )}
                    <button className="w-7 h-7 rounded-full bg-[#0064E6] text-white flex items-center justify-center" onClick={() => changeQuantity(dish, 1)}><PlusOutlined /></button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
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
