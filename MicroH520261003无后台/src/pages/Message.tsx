import React, { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Badge, Button, Card, Empty, List, PullToRefresh, Tabs, Toast } from 'antd-mobile';
import {
  BellOutlined,
  CalendarOutlined,
  CameraOutlined,
  CoffeeOutlined,
  CreditCardOutlined,
  NotificationOutlined,
  PayCircleOutlined,
  SettingOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import type { MessageType } from '../data/mock';

const typeMeta: Record<MessageType, { label: string; color: string; icon: React.ReactNode }> = {
  recharge: { label: '充值', color: '#16A34A', icon: <PayCircleOutlined /> },
  consumption: { label: '消费', color: '#EA580C', icon: <CreditCardOutlined /> },
  order: { label: '订餐', color: '#D97706', icon: <CoffeeOutlined /> },
  visitor: { label: '访客', color: '#DB2777', icon: <UserAddOutlined /> },
  attendance: { label: '考勤', color: '#0891B2', icon: <CalendarOutlined /> },
  face: { label: '人脸', color: '#DC2626', icon: <CameraOutlined /> },
  system: { label: '系统', color: '#64748B', icon: <NotificationOutlined /> },
};

const tabs = [
  { key: 'all', title: '全部' },
  { key: 'recharge', title: '充值' },
  { key: 'consumption', title: '消费' },
  { key: 'order', title: '订餐' },
  { key: 'visitor', title: '访客' },
  { key: 'attendance', title: '考勤' },
  { key: 'face', title: '人脸' },
  { key: 'system', title: '系统' },
];

export default function Message(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { messages, unreadCount, markMessageRead, markAllMessagesRead, notificationSettings } = useApp();
  const [activeTab, setActiveTab] = useState('all');

  const filtered = useMemo(() => messages.filter((item) =>
    (activeTab === 'all' || item.type === activeTab) && notificationSettings[item.type],
  ), [activeTab, messages, notificationSettings]);

  const refresh = async (): Promise<void> => {
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    Toast.show({ content: '消息已刷新', position: 'center' });
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="bg-white px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-3 sticky top-0 z-10 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <Button size="small" fill="none" disabled={unreadCount === 0} onClick={markAllMessagesRead}>全部已读</Button>
          <div className="text-lg font-semibold text-gray-900">消息中心 {unreadCount > 0 && <Badge content={unreadCount} className="ml-1" />}</div>
          <Button size="small" fill="none" onClick={() => setLocation('/message-settings')}><SettingOutlined /></Button>
        </div>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} className="bg-white">
        {tabs.map((item) => <Tabs.Tab title={item.title} key={item.key} />)}
      </Tabs>

      <PullToRefresh onRefresh={refresh}>
        <div className="p-4 pb-6">
          {filtered.length > 0 ? (
            <List className="!rounded-2xl overflow-hidden">
              {filtered.map((message) => {
                const meta = typeMeta[message.type];
                return (
                  <List.Item
                    key={message.id}
                    prefix={<div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-lg" style={{ backgroundColor: meta.color }}>{meta.icon}</div>}
                    className={!message.read ? '!bg-blue-50/60' : ''}
                    onClick={() => markMessageRead(message.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{message.title}</span>
                          {!message.read && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" aria-label="未读" />}
                        </div>
                        <div className="text-sm text-gray-500 leading-5 mt-1">{message.content}</div>
                        <div className="text-xs text-gray-400 mt-2">{meta.label} · {message.time}</div>
                      </div>
                    </div>
                  </List.Item>
                );
              })}
            </List>
          ) : (
            <Card className="!rounded-2xl !border !border-gray-100 mt-10">
              <Empty image={<BellOutlined className="text-6xl text-gray-300" />} description="当前分类暂无消息" />
            </Card>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}
