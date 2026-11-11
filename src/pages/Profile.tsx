import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Avatar, Button, Card, Dialog, ImageViewer, List, Tag, Toast } from 'antd-mobile';
import {
  BellOutlined,
  CameraOutlined,
  CreditCardOutlined,
  CustomerServiceOutlined,
  FileProtectOutlined,
  LockOutlined,
  LogoutOutlined,
  MobileOutlined,
  QuestionCircleOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import { accountStatusText, formatMoney, maskCardNo } from '../lib/utils';

const faceText = {
  none: '未采集',
  reviewing: '审核中',
  approved: '已通过',
  rejected: '未通过',
} as const;

export default function Profile(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { user, account, faceStatus, facePhoto, unbindAccount } = useApp();
  // 头像大图预览开关（仅在有后台人脸照片时可打开）
  const [avatarViewerVisible, setAvatarViewerVisible] = useState(false);
  // 后台 ST_PersonPhoto 有该人员记录（=已通过）且返回了照片时，头像用真实人脸照片，否则用默认头像
  const hasFacePhoto = faceStatus === 'approved' && !!facePhoto;

  const handleUnbind = (): void => {
    Dialog.confirm({
      title: '解绑微信账户',
      content: '解绑后当前微信将无法访问账户数据，需要重新完成身份验证。确定解绑吗？',
      confirmText: '确认解绑',
      cancelText: '取消',
      onConfirm: () => {
        unbindAccount();
        Toast.show({ content: '已解绑', position: 'center' });
        setLocation('/bind-account');
      },
    });
  };

  const menuItems = [
    { icon: <CreditCardOutlined />, text: '卡片管理', desc: '挂失、解挂与状态同步', color: '#0064E6', path: '/card-manage' },
    { icon: <LockOutlined />, text: '密码管理', desc: '修改或重置一卡通密码', color: '#7C3AED', path: '/password-manage' },
    { icon: <MobileOutlined />, text: '更换手机号', desc: '短信验证后换绑手机号', color: '#0891B2', path: '/phone-change' },
    { icon: <BellOutlined />, text: '消息设置', desc: '按类型管理提醒', color: '#EA580C', path: '/message-settings' },
    { icon: <CustomerServiceOutlined />, text: '意见反馈', desc: '提交工单并查看进度', color: '#16A34A', path: '/feedback' },
    { icon: <QuestionCircleOutlined />, text: '帮助中心', desc: 'FAQ、指引与客服', color: '#DB2777', path: '/help' },
    { icon: <FileProtectOutlined />, text: '协议与关于', desc: '隐私政策、用户协议、版本', color: '#64748B', path: '/agreement' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-6">
      <div className="bg-[#0064E6] px-4 pt-[calc(env(safe-area-inset-top)+20px)] pb-14">
        <div className="flex items-center gap-4">
          {/* 头像：有后台人脸照片时显示照片、无照片时显示默认头像；有照片时点击查看完整大图 */}
          <Avatar
            src={hasFacePhoto ? facePhoto : ''}
            alt={hasFacePhoto ? '人脸照片' : '默认头像'}
            className={hasFacePhoto ? 'w-16 h-16 border-2 border-white/80 cursor-zoom-in' : 'w-16 h-16 border-2 border-white/80'}
            onClick={hasFacePhoto ? () => setAvatarViewerVisible(true) : undefined}
          />
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-xl">{user.name}</div>
            <div className="text-blue-100 text-sm mt-1">{user.department} · 工号 {user.employeeNo}</div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Tag color="success" fill="outline" className="!text-xs !border-white/40 !text-white">已绑定</Tag>
              <Tag color={faceStatus === 'approved' ? 'success' : 'warning'} fill="outline" className="!text-xs !border-white/40 !text-white">
                人脸{faceText[faceStatus]}
              </Tag>
            </div>
          </div>
        </div>

        <button className="w-full text-left mt-6" onClick={() => setLocation('/account-detail')}>
          <Card className="!rounded-2xl !border-0 !shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">账户余额</div>
                <div className="text-3xl font-bold text-gray-900 font-mono mt-1">¥{formatMoney(account.balance)}</div>
                <div className="text-xs text-gray-400 mt-2">{maskCardNo(account.cardNo)}</div>
              </div>
              <div className="text-right">
                <Tag color={account.status === 'normal' ? 'success' : 'danger'}>{accountStatusText(account.status)}</Tag>
                <div className="text-xs text-gray-400 mt-3">更新于 {account.updatedAt}</div>
              </div>
            </div>
          </Card>
        </button>
      </div>

      <div className="px-4 -mt-6 space-y-4">
        <Card className="!rounded-2xl !border !border-gray-100" bodyClassName="!p-0">
          <List>
            <List.Item
              prefix={<div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center"><CameraOutlined /></div>}
              extra={faceText[faceStatus]}
              arrow={<RightOutlined className="text-gray-300 text-xs" />}
              onClick={() => setLocation('/face-collection')}
            >
              人脸采集状态
            </List.Item>
            <List.Item
              prefix={<div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0064E6] flex items-center justify-center"><SafetyCertificateOutlined /></div>}
              description={`手机号 ${user.phone}`}
              arrow={<RightOutlined className="text-gray-300 text-xs" />}
              onClick={() => setLocation('/phone-change')}
            >
              账户安全
            </List.Item>
          </List>
        </Card>

        <Card className="!rounded-2xl !border !border-gray-100" bodyClassName="!p-0">
          <List>
            {menuItems.map((item) => (
              <List.Item
                key={item.text}
                prefix={
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: item.color }}>
                    {item.icon}
                  </div>
                }
                description={item.desc}
                arrow={<RightOutlined className="text-gray-300 text-xs" />}
                onClick={() => setLocation(item.path)}
              >
                {item.text}
              </List.Item>
            ))}
          </List>
        </Card>

        <Button block fill="none" className="!text-red-500 !h-12" onClick={handleUnbind}>
          <LogoutOutlined className="mr-2" />解绑微信账户
        </Button>
        <div className="text-center text-xs text-gray-400 pt-2">一脸通微信端 H5 · V1.1.0</div>
      </div>

      {/* 点击头像查看完整人脸照片（有照片时才会挂载） */}
      {hasFacePhoto && (
        <ImageViewer.Multi
          visible={avatarViewerVisible}
          images={[facePhoto]}
          defaultIndex={0}
          onClose={() => setAvatarViewerVisible(false)}
        />
      )}
    </div>
  );
}