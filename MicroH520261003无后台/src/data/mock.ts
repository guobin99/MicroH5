export type AccountStatus = 'normal' | 'locked' | 'frozen';
export type FaceStatus = 'none' | 'reviewing' | 'approved' | 'rejected';
export type MessageType = 'recharge' | 'consumption' | 'order' | 'visitor' | 'attendance' | 'face' | 'system';
export type MealOrderStatus = 'ordered' | 'picked' | 'refunded' | 'expired';
export type VisitorStatus = 'approved' | 'pending' | 'rejected' | 'completed';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  name: string;
  department: string;
  title: string;
  employeeNo: string;
  phone: string;
  idCard: string;
}

export interface AccountInfo {
  balance: number;
  pendingAmount: number;
  cardNo: string;
  status: AccountStatus;
  updatedAt: string;
}

export interface MessageItem {
  id: string;
  type: MessageType;
  title: string;
  content: string;
  time: string;
  read: boolean;
}

export interface RechargeRecord {
  id: string;
  amount: number;
  channel: '微信支付';
  status: 'paid' | 'pending' | 'refunded' | 'closed';
  time: string;
  orderNo: string;
  merchantNo: string;
  progress: string;
}

export interface ConsumptionRecord {
  id: string;
  type: 'consumption' | 'order' | 'refund';
  title: string;
  location: string;
  amount: number;
  balanceAfter: number;
  time: string;
  orderNo: string;
  terminalNo: string;
  status: 'success' | 'processing' | 'appealing';
}

export interface AccessRecord {
  id: string;
  door: string;
  time: string;
  method: '二维码' | '人脸' | '刷卡';
  result: 'success' | 'denied' | 'offline';
  reason?: string;
}

export interface MealOrder {
  id: string;
  orderNo: string;
  date: string;
  canteen: string;
  meal: string;
  items: string[];
  amount: number;
  status: MealOrderStatus;
  pickupCode: string;
  pickupTime: string;
  deadline: string;
}

export interface VisitorRecord {
  id: string;
  visitorName: string;
  visitorPhone: string;
  idCard: string;
  company?: string;
  department: string;
  reason: string;
  visitDate: string;
  visitTime: string;
  companions: number;
  plate?: string;
  status: VisitorStatus;
  applyTime: string;
  passCode?: string;
  signOutTime?: string;
  rejectReason?: string;
}

export interface AttendanceApplication {
  id: string;
  type: '补签' | '请假' | '申诉';
  title: string;
  dateRange: string;
  reason: string;
  status: ApplicationStatus;
  submitTime: string;
  attachmentName?: string;
}

export const initialUser: UserProfile = {
  name: '张三',
  department: '技术部',
  title: '工程师',
  employeeNo: '8888',
  phone: '138****5678',
  idCard: '110***********1234',
};

export const initialAccount: AccountInfo = {
  balance: 256.8,
  pendingAmount: 0,
  cardNo: '8888888812345678',
  status: 'normal',
  updatedAt: '2026-10-01 08:30',
};

export const initialMessages: MessageItem[] = [
  {
    id: 'MSG001',
    type: 'recharge',
    title: '充值到账通知',
    content: '您已成功充值100元，当前余额256.80元。',
    time: '2026-10-01 10:30',
    read: false,
  },
  {
    id: 'MSG002',
    type: 'consumption',
    title: '消费扣款通知',
    content: '您在第一食堂消费15.00元，余额241.80元。',
    time: '2026-10-01 12:15',
    read: false,
  },
  {
    id: 'MSG003',
    type: 'order',
    title: '订餐成功通知',
    content: '您预订的午餐已确认，取餐码 A123。',
    time: '2026-10-01 09:00',
    read: true,
  },
  {
    id: 'MSG004',
    type: 'visitor',
    title: '访客审批结果',
    content: '您预约的访客李四已通过审批，通行凭证已生效。',
    time: '2026-09-30 14:20',
    read: true,
  },
  {
    id: 'MSG005',
    type: 'attendance',
    title: '考勤异常提醒',
    content: '您昨日存在迟到记录，如有误判可发起申诉或补签。',
    time: '2026-09-30 08:35',
    read: true,
  },
  {
    id: 'MSG006',
    type: 'face',
    title: '人脸采集审核结果',
    content: '您提交的人脸照片已通过审核并下发至授权设备。',
    time: '2026-09-28 16:45',
    read: true,
  },
  {
    id: 'MSG007',
    type: 'system',
    title: '系统维护通知',
    content: '本周六 22:00-23:00 平台例行维护，期间部分查询服务可能延迟。',
    time: '2026-09-27 18:00',
    read: true,
  },
];

export const initialRechargeRecords: RechargeRecord[] = [
  {
    id: 'RR001',
    amount: 100,
    channel: '微信支付',
    status: 'paid',
    time: '2026-09-30 10:30',
    orderNo: 'R202609301030001',
    merchantNo: '420000245620260930001',
    progress: '支付成功，平台已入账',
  },
  {
    id: 'RR002',
    amount: 200,
    channel: '微信支付',
    status: 'paid',
    time: '2026-09-25 14:20',
    orderNo: 'R202609251420001',
    merchantNo: '420000245620260925001',
    progress: '支付成功，平台已入账',
  },
  {
    id: 'RR003',
    amount: 50,
    channel: '微信支付',
    status: 'pending',
    time: '2026-09-20 09:15',
    orderNo: 'R202609200915001',
    merchantNo: '420000245620260920001',
    progress: '支付成功，平台入账重试中',
  },
  {
    id: 'RR004',
    amount: 100,
    channel: '微信支付',
    status: 'refunded',
    time: '2026-09-05 16:45',
    orderNo: 'R202609051645001',
    merchantNo: '420000245620260905001',
    progress: '平台入账超时，已原路退款',
  },
];

export const initialConsumptionRecords: ConsumptionRecord[] = [
  {
    id: 'CR001',
    type: 'consumption',
    title: '食堂消费',
    location: '第一食堂 3号窗口',
    amount: -15,
    balanceAfter: 241.8,
    time: '2026-10-01 12:15',
    orderNo: 'C202610011215001',
    terminalNo: 'CANTEEN-A-03',
    status: 'success',
  },
  {
    id: 'CR002',
    type: 'consumption',
    title: '超市购物',
    location: '校园超市',
    amount: -28.5,
    balanceAfter: 256.8,
    time: '2026-09-30 18:30',
    orderNo: 'C202609301830001',
    terminalNo: 'MARKET-01',
    status: 'success',
  },
  {
    id: 'CR003',
    type: 'order',
    title: '订餐扣款',
    location: '在线订餐',
    amount: -22,
    balanceAfter: 285.3,
    time: '2026-09-29 09:15',
    orderNo: 'O202609290915001',
    terminalNo: 'H5-ORDER',
    status: 'success',
  },
  {
    id: 'CR004',
    type: 'refund',
    title: '订餐退款',
    location: '在线订餐',
    amount: 18,
    balanceAfter: 307.3,
    time: '2026-09-20 10:05',
    orderNo: 'RF202609201005001',
    terminalNo: 'H5-ORDER',
    status: 'success',
  },
  {
    id: 'CR005',
    type: 'consumption',
    title: '食堂消费',
    location: '第二食堂 1号窗口',
    amount: -12,
    balanceAfter: 289.3,
    time: '2026-09-12 12:00',
    orderNo: 'C202609121200001',
    terminalNo: 'CANTEEN-B-01',
    status: 'appealing',
  },
];

export const initialAccessRecords: AccessRecord[] = [
  { id: 'AR001', door: '东门门禁', time: '2026-10-01 08:30', method: '二维码', result: 'success' },
  { id: 'AR002', door: '办公楼大厅', time: '2026-10-01 08:32', method: '人脸', result: 'success' },
  { id: 'AR003', door: '食堂入口', time: '2026-10-01 12:00', method: '刷卡', result: 'success' },
  { id: 'AR004', door: '档案室', time: '2026-09-30 16:20', method: '二维码', result: 'denied', reason: '无该门点权限' },
  { id: 'AR005', door: '宿舍区西门', time: '2026-09-28 21:10', method: '人脸', result: 'offline', reason: '设备离线，稍后自动补传' },
];

export const initialMealOrders: MealOrder[] = [
  {
    id: 'MO001',
    orderNo: 'O20261001001',
    date: '2026-10-01',
    canteen: '第一食堂',
    meal: '午餐',
    items: ['红烧肉 ×1', '番茄炒蛋 ×1', '米饭 ×1'],
    amount: 22,
    status: 'ordered',
    pickupCode: 'A123',
    pickupTime: '11:30-13:30',
    deadline: '2026-10-01 10:30',
  },
  {
    id: 'MO002',
    orderNo: 'O20260930001',
    date: '2026-09-30',
    canteen: '第二食堂',
    meal: '晚餐',
    items: ['标准套餐 ×1'],
    amount: 18,
    status: 'picked',
    pickupCode: 'B456',
    pickupTime: '17:30-19:30',
    deadline: '2026-09-30 16:30',
  },
  {
    id: 'MO003',
    orderNo: 'O20260920001',
    date: '2026-09-20',
    canteen: '第一食堂',
    meal: '早餐',
    items: ['豆浆 ×1', '油条 ×1', '包子 ×1'],
    amount: 7,
    status: 'refunded',
    pickupCode: 'C789',
    pickupTime: '07:00-09:00',
    deadline: '2026-09-19 20:00',
  },
];

export const initialVisitorRecords: VisitorRecord[] = [
  {
    id: 'VR001',
    visitorName: '李四',
    visitorPhone: '138****5678',
    idCard: '110***********5678',
    company: '云启科技',
    department: '技术部',
    reason: '商务洽谈',
    visitDate: '2026-10-02',
    visitTime: '09:00-11:00',
    companions: 1,
    plate: '京A·12345',
    status: 'approved',
    applyTime: '2026-09-30 10:30',
    passCode: 'VIS-7K2P9Q',
  },
  {
    id: 'VR002',
    visitorName: '王五',
    visitorPhone: '139****9012',
    idCard: '110***********9012',
    company: '远景咨询',
    department: '人事部',
    reason: '面试',
    visitDate: '2026-10-03',
    visitTime: '14:00-16:00',
    companions: 0,
    status: 'pending',
    applyTime: '2026-10-01 09:45',
  },
  {
    id: 'VR003',
    visitorName: '赵六',
    visitorPhone: '137****3456',
    idCard: '110***********3456',
    company: '安捷设备',
    department: '行政部',
    reason: '设备维护',
    visitDate: '2026-09-28',
    visitTime: '10:00-12:00',
    companions: 2,
    status: 'rejected',
    applyTime: '2026-09-27 09:15',
    rejectReason: '维护计划未与设备管理部门确认',
  },
  {
    id: 'VR004',
    visitorName: '孙七',
    visitorPhone: '136****7890',
    idCard: '110***********7890',
    company: '晨光传媒',
    department: '市场部',
    reason: '合作洽谈',
    visitDate: '2026-09-20',
    visitTime: '15:00-17:00',
    companions: 0,
    status: 'completed',
    applyTime: '2026-09-19 11:20',
    passCode: 'VIS-9Q2M8L',
    signOutTime: '2026-09-20 17:12',
  },
];

export const initialAttendanceApplications: AttendanceApplication[] = [
  {
    id: 'AP001',
    type: '补签',
    title: '上班缺卡补签',
    dateRange: '2026-09-28 08:30',
    reason: '早晨设备网络异常，无法完成打卡。',
    status: 'approved',
    submitTime: '2026-09-28 10:20',
  },
  {
    id: 'AP002',
    type: '请假',
    title: '事假申请',
    dateRange: '2026-10-10 至 2026-10-11',
    reason: '家中有事，需请假两天。',
    status: 'pending',
    submitTime: '2026-10-01 09:30',
    attachmentName: '请假说明.pdf',
  },
];

export const defaultNotificationSettings: Record<MessageType, boolean> = {
  recharge: true,
  consumption: true,
  order: true,
  visitor: true,
  attendance: true,
  face: true,
  system: true,
};
