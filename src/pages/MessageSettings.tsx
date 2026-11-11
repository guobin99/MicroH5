import React from 'react';
import { useLocation } from 'wouter';
import { Card, List, NavBar, Switch } from 'antd-mobile';
import {
  BellOutlined,
  CalendarOutlined,
  CameraOutlined,
  CoffeeOutlined,
  CreditCardOutlined,
  NotificationOutlined,
  PayCircleOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import type { MessageType } from '../data/mock';

const items: { key: MessageType; title: string; desc: string; color: string; icon: React.ReactNode }[] = [
  { key: 'recharge', title: '充值到账提醒', desc: '支付成功、入账与退款结果', color: '#16A34A', icon: <PayCircleOutlined /> },
  { key: 'consumption', title: '消费扣款提醒', desc: '付款码、终端消费与退款', color: '#EA580C', icon: <CreditCardOutlined /> },
  { key: 'order', title: '订餐通知', desc: '订餐成功、退订与取餐提醒', color: '#D97706', icon: <CoffeeOutlined /> },
  { key: 'visitor', title: '访客通知', desc: '审批结果、到访与签离', color: '#DB2777', icon: <UserAddOutlined /> },
  { key: 'attendance', title: '考勤提醒', desc: '异常、补签与请假审批结果', color: '#0891B2', icon: <CalendarOutlined /> },
  { key: 'face', title: '人脸审核通知', desc: '采集审核与下发结果', color: '#DC2626', icon: <CameraOutlined /> },
  { key: 'system', title: '系统公告', desc: '平台维护与重要通知', color: '#64748B', icon: <NotificationOutlined /> },
];

export default function MessageSettings(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { notificationSettings, toggleNotification } = useApp();

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar onBack={() => setLocation('/message')} className="bg-white">消息设置</NavBar>
      <div className="p-4 space-y-4">
        <Card className="!rounded-2xl !border !border-gray-100" bodyClassName="!p-0">
          <List>
            {items.map((item) => (
              <List.Item
                key={item.key}
                prefix={<div className="w-10 h-10 rounded-xl text-white flex items-center justify-center" style={{ backgroundColor: item.color }}>{item.icon}</div>}
                description={item.desc}
                extra={<Switch checked={notificationSettings[item.key]} onChange={() => toggleNotification(item.key)} />}
              >
                {item.title}
              </List.Item>
            ))}
          </List>
        </Card>
        <Card className="!rounded-2xl !border !border-blue-100 !bg-blue-50">
          <div className="flex gap-3">
            <BellOutlined className="text-[#0064E6] text-xl" />
            <div className="text-xs text-[#0064E6] leading-5">
              关闭某类提醒后，消息中心仍会保留历史记录；正式环境通过公众号模板消息/订阅消息下发，服务端仍需按用户偏好控制推送。
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
