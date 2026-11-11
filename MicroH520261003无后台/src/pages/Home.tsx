import React from 'react';
import { useLocation } from 'wouter';
import { Avatar, Badge, Button, Card, Grid, NoticeBar, Space, Tag } from 'antd-mobile';
import {
  BellOutlined,
  CalendarOutlined,
  CameraOutlined,
  CoffeeOutlined,
  GatewayOutlined,
  PayCircleOutlined,
  QrcodeOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import { accountStatusText, formatMoney, maskCardNo } from '../lib/utils';

interface QuickAction {
  icon: React.ReactNode;
  text: string;
  color: string;
  path: string;
}

const quickActions: QuickAction[] = [
  { icon: <PayCircleOutlined />, text: '充值', color: '#0064E6', path: '/recharge' },
  { icon: <QrcodeOutlined />, text: '付款码', color: '#16A34A', path: '/payment-code' },
  { icon: <GatewayOutlined />, text: '通行码', color: '#7C3AED', path: '/pass-code' },
  { icon: <CoffeeOutlined />, text: '订餐', color: '#EA580C', path: '/menu' },
  { icon: <UserAddOutlined />, text: '访客', color: '#DB2777', path: '/visitor-appointment' },
  { icon: <CalendarOutlined />, text: '考勤', color: '#0891B2', path: '/attendance' },
  { icon: <CameraOutlined />, text: '人脸采集', color: '#DC2626', path: '/face-collection' },
  { icon: <RightOutlined />, text: '更多', color: '#4B5563', path: '/service' },
];

const todayMenu = [
  { name: '红烧肉', price: 12, tag: '荤菜', window: '3号窗口' },
  { name: '清炒时蔬', price: 6, tag: '素菜', window: '5号窗口' },
  { name: '番茄炒蛋', price: 8, tag: '半荤', window: '4号窗口' },
];

const faceStatusText = {
  none: '未采集',
  reviewing: '审核中',
  approved: '已通过',
  rejected: '未通过',
} as const;

export default function Home(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { user, account, faceStatus, unreadCount } = useApp();

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-6">
      <div className="bg-[#0064E6] px-4 pt-[calc(env(safe-area-inset-top)+20px)] pb-16 rounded-b-[28px]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Avatar src="" className="w-12 h-12 border-2 border-white/80" />
            <div className="text-white">
              <div className="font-semibold text-lg leading-6">{user.name}</div>
              <div className="text-xs text-blue-100 mt-0.5">{user.department} · {user.title}</div>
            </div>
          </div>
          <Badge content={unreadCount > 0 ? unreadCount : null}>
            <Button
              aria-label="消息通知"
              className="!w-10 !h-10 !rounded-full !bg-white/15 !border-0 flex items-center justify-center"
              onClick={() => setLocation('/message')}
            >
              <BellOutlined className="text-white text-lg" />
            </Button>
          </Badge>
        </div>

        <button className="w-full text-left" onClick={() => setLocation('/account-detail')}>
          <Card className="!rounded-2xl !border-0 !shadow-[0_12px_32px_rgba(0,38,95,0.18)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">账户余额</span>
                  <Tag color={account.status === 'normal' ? 'success' : 'danger'} fill="outline">
                    {accountStatusText(account.status)}
                  </Tag>
                </div>
                <div className="mt-2 text-[34px] leading-10 font-bold text-gray-900 font-mono">
                  <span className="text-xl">¥</span>{formatMoney(account.balance)}
                </div>
                <div className="text-xs text-gray-400 mt-2">{maskCardNo(account.cardNo)} · 更新于 {account.updatedAt}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-50 text-[#0064E6] flex items-center justify-center">
                <RightOutlined />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>待圈存 ¥{formatMoney(account.pendingAmount)}</span>
              <span className="text-[#0064E6] font-medium">查看账户详情</span>
            </div>
          </Card>
        </button>
      </div>

      <div className="px-4 -mt-8 space-y-4">
        {faceStatus !== 'approved' && (
          <NoticeBar
            color="alert"
            content={`人脸采集${faceStatusText[faceStatus]}，完成后可使用刷脸消费与门禁。`}
            onClick={() => setLocation('/face-collection')}
          />
        )}

        <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">常用服务</h2>
            <span className="text-xs text-gray-400">核心操作不超过3步</span>
          </div>
          <Grid columns={4} gap={10}>
            {quickActions.map((item) => (
              <Grid.Item key={item.text} onClick={() => setLocation(item.path)}>
                <div className="flex flex-col items-center gap-2 py-2 min-h-[74px]">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-xl shadow-sm"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.icon}
                  </div>
                  <span className="text-xs text-gray-700">{item.text}</span>
                </div>
              </Grid.Item>
            ))}
          </Grid>
        </section>

        <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">今日菜谱</h2>
              <p className="text-xs text-gray-400 mt-1">第一食堂 · 午餐 · 11:30-13:30</p>
            </div>
            <Button size="mini" fill="none" onClick={() => setLocation('/menu')}>
              全部菜谱 <RightOutlined className="text-xs" />
            </Button>
          </div>
          <Space direction="vertical" className="w-full space-y-3">
            {todayMenu.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                    <CoffeeOutlined />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">{item.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{item.window} · {item.tag}</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-orange-600 font-mono">¥{item.price}</div>
              </div>
            ))}
          </Space>
        </section>

        <button
          className="w-full bg-[#EAF3FF] rounded-2xl p-4 flex items-center gap-3 text-left"
          onClick={() => setLocation('/message')}
        >
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#0064E6] shadow-sm">
            <SafetyCertificateOutlined />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-800">安全提醒</div>
            <div className="text-xs text-gray-500 mt-1">付款码与通行码均为动态码，请勿截图或转发。</div>
          </div>
          <RightOutlined className="text-gray-400 text-xs" />
        </button>
      </div>
    </div>
  );
}
