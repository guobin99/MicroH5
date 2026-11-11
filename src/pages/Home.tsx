import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Avatar, Badge, Button, Card, Grid, ImageViewer, NoticeBar, Space, Tag } from 'antd-mobile';
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
import { m } from '../lib/api';

interface TodayDish {
  name: string;
  price: number;
  tag: string;
  copies: number | null;
}

interface TodayMenuMeta {
  areaName: string;
  repastName: string;
  timeRange: string;
  /** 订餐规则提示（DC_Repast.Can_Order / Order_Days / End_Time） */
  orderTip: string;
  /** 当前餐别是否还能订 */
  canOrder: boolean;
}

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
  { icon: <CoffeeOutlined />, text: '订餐', color: '#EA580C', path: '/order' },
  { icon: <UserAddOutlined />, text: '访客', color: '#DB2777', path: '/visitor-appointment' },
  { icon: <CalendarOutlined />, text: '考勤', color: '#0891B2', path: '/attendance' },
  { icon: <CameraOutlined />, text: '人脸采集', color: '#DC2626', path: '/face-collection' },
  { icon: <RightOutlined />, text: '更多', color: '#4B5563', path: '/service' },
];

const faceStatusText = {
  none: '未采集',
  reviewing: '审核中',
  approved: '已通过',
  rejected: '未通过',
} as const;

export default function Home(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { user, account, faceStatus, facePhoto, unreadCount } = useApp();
  const [todayMenu, setTodayMenu] = useState<TodayDish[]>([]);
  const [menuMeta, setMenuMeta] = useState<TodayMenuMeta>({ areaName: '', repastName: '', timeRange: '', orderTip: '', canOrder: true });
  // 头像大图预览开关（仅在有后台人脸照片时可打开）
  const [avatarViewerVisible, setAvatarViewerVisible] = useState(false);
  // 后台 ST_PersonPhoto 有该人员记录（=已通过）且返回了照片时，头像用真实人脸照片，否则用默认头像
  const hasFacePhoto = faceStatus === 'approved' && !!facePhoto;

  // 今日菜谱：取自后台 XF_WareInWeek
  // （餐别名称 SF_Repast、食堂名称 XF_Area、菜品 XF_WareInfo、菜品类别 XF_WareType 由接口组装返回）
  useEffect(() => {
    m.todayMenu().then((res: any) => {
      if (!res) return;
      setMenuMeta({
        areaName: res.areaName || '',
        repastName: res.repastName || '',
        timeRange: res.timeRange || '',
        // 订餐规则提示（DC_Repast.Can_Order / Order_Days / End_Time）
        orderTip: res.orderTip || '',
        canOrder: res.canOrder !== false,
      });
      const rows = Array.isArray(res.dishes) ? res.dishes : [];
      setTodayMenu(rows.map((r: any) => ({
        name: r.name || '',
        price: Number(r.price || 0),
        tag: r.typeName || '',
        // 剩余份数（-1 表示不限量），与「每日菜谱」口径一致
        copies: r.remainCopies == null ? null : Number(r.remainCopies),
      })));
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-6">
      <div className="bg-[#0064E6] px-4 pt-[calc(env(safe-area-inset-top)+20px)] pb-16 rounded-b-[28px]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {/* 头像：有后台人脸照片时显示照片、无照片时显示默认头像；有照片时点击查看完整大图 */}
            <Avatar
              src={hasFacePhoto ? facePhoto : ''}
              alt={hasFacePhoto ? '人脸照片' : '默认头像'}
              className={hasFacePhoto ? 'w-12 h-12 border-2 border-white/80 cursor-zoom-in' : 'w-12 h-12 border-2 border-white/80'}
              onClick={hasFacePhoto ? () => setAvatarViewerVisible(true) : undefined}
            />
            <div className="text-white">
              <div className="font-semibold text-lg leading-6">{user.name}</div>
              <div className="text-xs text-blue-100 mt-0.5">{user.department} { user.title ? '·' : '' } {user.title}</div>
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
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-gray-900">今日菜谱</h2>
              <p className="text-xs text-gray-400 mt-1">
                {/* 只显示「餐别 · 时段」：食堂名无筛选意义，全天时段（00:00-23:59）是噪音 */}
                {menuMeta.repastName
                  ? [menuMeta.repastName, menuMeta.timeRange && menuMeta.timeRange !== '00:00-23:59' ? menuMeta.timeRange : ''].filter(Boolean).join(' · ')
                  : '暂无菜谱信息'}
              </p>
            </div>
            <Button size="mini" fill="none" className="!shrink-0 !whitespace-nowrap" onClick={() => setLocation('/menu')}>
              全部菜谱 &gt;{/* 全部菜谱 <RightOutlined className="text-xs" /> */}
            </Button>
          </div>
          {menuMeta.orderTip && (
            <div className={`mb-3 rounded-xl px-3 py-2 text-xs leading-5 ${menuMeta.canOrder ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-600'}`}>
              {menuMeta.orderTip}
            </div>
          )}
          <Space direction="vertical" className="w-full space-y-3">
            {todayMenu.length === 0 ? (
              <div className="text-xs text-gray-400 py-2">今日暂无菜谱</div>
            ) : todayMenu.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                    <CoffeeOutlined />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">{item.name}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {/* 剩余份数（-1 表示不限量） */}
                      {[item.tag, item.copies == null ? '' : item.copies < 0 ? '余量充足' : `余${item.copies}份`].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-orange-600 font-mono">¥{formatMoney(item.price)}</div>
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
