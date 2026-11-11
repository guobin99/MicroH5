import React from 'react';
import { Badge, TabBar } from 'antd-mobile';
import { useLocation } from 'wouter';
import { AppstoreOutlined, HomeOutlined, MessageOutlined, UserOutlined } from '@ant-design/icons';
import Home from '../pages/Home';
import Service from '../pages/Service';
import Message from '../pages/Message';
import Profile from '../pages/Profile';
import { useApp } from '../context/AppContext';

const tabs = [
  { key: 'home', title: '首页', icon: <HomeOutlined /> },
  { key: 'service', title: '服务', icon: <AppstoreOutlined /> },
  { key: 'message', title: '消息', icon: <MessageOutlined /> },
  { key: 'profile', title: '我的', icon: <UserOutlined /> },
];

export default function MainLayout(): React.JSX.Element {
  const [location, setLocation] = useLocation();
  const { unreadCount } = useApp();

  const activeKey = location === '/service'
    ? 'service'
    : location === '/message'
      ? 'message'
      : location === '/profile'
        ? 'profile'
        : 'home';

  return (
    <div className="flex flex-col h-screen bg-[#F5F7FA] max-w-screen-sm mx-auto shadow-sm">
      <main className="flex-1 overflow-auto">
        {activeKey === 'home' && <Home />}
        {activeKey === 'service' && <Service />}
        {activeKey === 'message' && <Message />}
        {activeKey === 'profile' && <Profile />}
      </main>

      <footer className="bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
        <TabBar activeKey={activeKey} onChange={(key) => setLocation(key === 'home' ? '/' : `/${key}`)}>
          {tabs.map((item) => (
            <TabBar.Item
              key={item.key}
              title={item.title}
              icon={item.key === 'message' && unreadCount > 0
                ? <Badge content={unreadCount}>{item.icon}</Badge>
                : item.icon}
            />
          ))}
        </TabBar>
      </footer>
    </div>
  );
}
