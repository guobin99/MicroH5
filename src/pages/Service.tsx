import React from 'react';
import { useLocation } from 'wouter';
import { Card, List } from 'antd-mobile';
import {
  AccountBookOutlined,
  CalendarOutlined,
  CameraOutlined,
  CheckSquareOutlined,
  CoffeeOutlined,
  CreditCardOutlined,
  CustomerServiceOutlined,
  FileTextOutlined,
  GatewayOutlined,
  HistoryOutlined,
  LockOutlined,
  PayCircleOutlined,
  QrcodeOutlined,
  QuestionCircleOutlined,
  RightOutlined,
  UserAddOutlined,
} from '@ant-design/icons';

interface ServiceItem {
  icon: React.ReactNode;
  text: string;
  description: string;
  color: string;
  path: string;
}

const serviceGroups: { title: string; items: ServiceItem[] }[] = [
  {
    title: '消费与账户',
    items: [
      { icon: <AccountBookOutlined />, text: '账户详情', description: '余额、状态与待圈存', color: '#0064E6', path: '/account-detail' },
      { icon: <PayCircleOutlined />, text: '微信充值', description: '常用金额与自定义金额', color: '#16A34A', path: '/recharge' },
      { icon: <QrcodeOutlined />, text: '付款码', description: '动态二维码/条形码', color: '#059669', path: '/payment-code' },
      { icon: <HistoryOutlined />, text: '消费记录', description: '消费流水与申诉', color: '#EA580C', path: '/consumption-records' },
      { icon: <FileTextOutlined />, text: '充值记录', description: '订单状态与处理进度', color: '#7C3AED', path: '/recharge-records' },
    ],
  },
  {
    title: '门禁通行',
    items: [
      { icon: <GatewayOutlined />, text: '通行二维码', description: '60秒动态刷新', color: '#7C3AED', path: '/pass-code' },
      { icon: <HistoryOutlined />, text: '通行记录', description: '门点、方式与失败原因', color: '#0891B2', path: '/access-records' },
    ],
  },
  {
    title: '食堂订餐',
    items: [
      { icon: <CoffeeOutlined />, text: '每日菜谱', description: '日期、食堂、餐别切换', color: '#EA580C', path: '/menu' },
      { icon: <CheckSquareOutlined />, text: '在线订餐', description: '菜谱/餐别批量订购', color: '#D97706', path: '/order' },
      { icon: <FileTextOutlined />, text: '订餐记录', description: '订餐明细、凭证与退订', color: '#65A30D', path: '/my-orders' },
    ],
  },
  {
    title: '访客管理',
    items: [
      { icon: <UserAddOutlined />, text: '访客预约', description: '被访人发起预约', color: '#DB2777', path: '/visitor-appointment' },
      { icon: <UserAddOutlined />, text: '访客登记', description: '访客自助登记', color: '#C026D3', path: '/visitor-register' },
      { icon: <CheckSquareOutlined />, text: '访客审批', description: '通过、驳回与原因', color: '#2563EB', path: '/visitor-approvals' },
      { icon: <FileTextOutlined />, text: '访客记录', description: '凭证、签离与筛选', color: '#E11D48', path: '/visitor-records' },
    ],
  },
  {
    title: '考勤服务',
    items: [
      { icon: <CalendarOutlined />, text: '考勤记录', description: '日/月视图与统计', color: '#0891B2', path: '/attendance' },
      { icon: <FileTextOutlined />, text: '补签/请假', description: '申诉、附件与我的申请', color: '#4F46E5', path: '/attendance-apply' },
    ],
  },
  {
    title: '安全与帮助',
    items: [
      { icon: <CameraOutlined />, text: '人脸采集', description: '协议、拍照与质检', color: '#DC2626', path: '/face-collection' },
      { icon: <CreditCardOutlined />, text: '卡片管理', description: '挂失与解挂', color: '#334155', path: '/card-manage' },
      { icon: <LockOutlined />, text: '密码管理', description: '修改或重置密码', color: '#6D28D9', path: '/password-manage' },
      { icon: <CustomerServiceOutlined />, text: '意见反馈', description: '工单与处理结果', color: '#EA580C', path: '/feedback' },
      { icon: <QuestionCircleOutlined />, text: '帮助中心', description: 'FAQ与客服信息', color: '#16A34A', path: '/help' },
    ],
  },
];

export default function Service(): React.JSX.Element {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-6">
      <div className="bg-white px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-4 sticky top-0 z-10 border-b border-gray-100">
        <div className="text-lg font-semibold text-center text-gray-900">全部服务</div>
        <div className="text-xs text-gray-400 text-center mt-1">按消费、门禁、订餐、访客、考勤分组</div>
      </div>

      <div className="px-4 pb-6">
        {serviceGroups.map((group) => (
          <section key={group.title} className="mt-4">
            <h2 className="text-sm font-semibold text-gray-500 mb-2 px-1">{group.title}</h2>
            <Card className="!rounded-2xl !border !border-gray-100 !shadow-sm" bodyClassName="!p-0">
              <List>
                {group.items.map((item) => (
                  <List.Item
                    key={item.text}
                    prefix={
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg"
                        style={{ backgroundColor: item.color }}
                      >
                        {item.icon}
                      </div>
                    }
                    description={item.description}
                    arrow={<RightOutlined className="text-gray-300 text-xs" />}
                    onClick={() => setLocation(item.path)}
                  >
                    <span className="font-medium text-gray-800">{item.text}</span>
                  </List.Item>
                ))}
              </List>
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}
