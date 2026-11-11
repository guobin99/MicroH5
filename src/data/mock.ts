export type AccountStatus = 'normal' | 'locked' | 'frozen';
export type FaceStatus = 'none' | 'reviewing' | 'approved' | 'rejected';
export type MessageType = 'recharge' | 'consumption' | 'order' | 'visitor' | 'attendance' | 'face' | 'system';
export type MealOrderStatus = 'ordered' | 'picked' | 'refunded' | 'expired' | 'cancelled';
export type VisitorStatus = 'approved' | 'pending' | 'rejected' | 'checkedin' | 'completed' | 'expired';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

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
  // 充值渠道：依据 ST_SupplyFund.Out_Trade_No 判定 → 非空为「微信充值」，为空为「刷卡充值」
  channel: string;
  status: 'paid' | 'pending' | 'refunded' | 'closed';
  time: string;
  orderNo: string;
  merchantNo: string;
  progress: string;
  // 充值前余额（ST_SupplyFund.Card_Balance，注意是充值前）、充值后余额（前+金额）
  beforeFund: number;
  balance: number;
}

/** 消费记录（XF_Consume）：与订餐记录分开显示，此处不含订餐维度 */
export interface ConsumptionRecord {
  id: string;
  type: 'consumption' | 'refund';
  title: string;
  amount: number;
  balanceAfter: number;
  /** 消费时间 Consume_Time */
  time: string;
  /** 消费金额 Consume_Fund */
  consumeFund: number;
  /** 消费后账户余额 Card_Balance */
  cardBalance: number;
  /** 餐别名称（Repast_No → SF_Repast.Repast_Name） */
  repastName: string;
  repastNo: string;
  /** 订单号 COM_No */
  orderNo: string;
  /** 机器编号 MOC_No / 机器名称（ST_MOC.MOC_Name） */
  mocNo: string;
  mocName: string;
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

/** 订餐记录菜品明细（DC_OrderDataSub / SF_OrderDataSub，名称取 XF_WareInfo.Ware_Name） */
export interface OrderDish {
  wareId: number;
  wareName: string;
  warePrice: number;
  copies: number;
  subtotal: number;
}

/** 订餐记录（DC.Solution=1 → DC_OrderData；=0 → SF_OrderData） */
export interface MealOrder {
  id: string;
  orderNo: string;
  /** 订餐日期 Order_date */
  date: string;
  /** 操作时间 Order_Time */
  orderTime: string;
  canteen: string;
  /** 餐别名称（Repast_No → SF_Repast.Repast_Name） */
  meal: string;
  repastNo: string;
  /** 订餐总金额 Order_Fund */
  amount: number;
  /** Is_WareOrder：0 订套餐，1 订菜品 */
  isWareOrder: boolean;
  /** copies 预定份数（订套餐用） */
  copies: number | null;
  /** 扣款模式：订餐扣款 / 消费扣款（取餐才扣） */
  mode: string;
  dishes: OrderDish[];
  status: MealOrderStatus;
  pickupCode: string;
  pickupTime: string;
  deadline: string;
}

export interface VisitorRecord {
  id: string;
  applyNo?: string;
  visitorName: string;
  /** 手机/证件号由后端脱敏后返回，前端只做展示 */
  visitorPhone: string;
  idCard: string;
  company?: string;
  /** 受访部门：由后端按被访人部门返回，提交时不必传 */
  department?: string;
  /** 被访人姓名（ST_Person.Person_Name） */
  respondentName?: string;
  reason: string;
  visitDate: string;
  visitTime: string;
  companions: number;
  plate?: string;
  status: VisitorStatus;
  applyTime: string;
  /** 临时卡号（来自卡池）或预约码 */
  passCode?: string;
  cardNo?: string;
  /** 后端签名的二维码凭证 token，missing 表示凭证不可用 */
  visitToken?: string;
  checkinTime?: string;
  signOutTime?: string;
  rejectReason?: string;
  visitorType?: string;
  carryItems?: string;
  /** 被访人 Person_ID（自助登记时选择） */
  respondentId?: number;
  /** 访客照片 dataURL（可选，提交时带上） */
  photo?: string;
  /** 后端是否已存有该访客照片 */
  hasPhoto?: boolean;
  /** 我是否为该记录的被访人（只有被访人能审批/签到/签离） */
  canHandle?: boolean;
  /** 这条是否由我提交（代录场景） */
  submittedByMe?: boolean;
}

export interface AttendanceApplication {
  id: string;
  /** 申请号（WX_KQ_Apply.Apply_No），撤回时用 */
  applyNo?: string;
  type: '补签' | '请假' | '申诉';
  title: string;
  dateRange: string;
  reason: string;
  status: ApplicationStatus;
  submitTime: string;
  attachmentName?: string;
  /** 仅「待审批」为 true */
  canCancel?: boolean;
  /** 审批意见（已通过/已驳回时展示） */
  auditRemark?: string;
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

// 充值记录一律只认后台数据（ST_SupplyFund），不预置演示数据，避免把假流水当成真实充值
export const initialRechargeRecords: RechargeRecord[] = [];


export const initialAccessRecords: AccessRecord[] = [
  { id: 'AR001', door: '东门门禁', time: '2026-10-01 08:30', method: '二维码', result: 'success' },
  { id: 'AR002', door: '办公楼大厅', time: '2026-10-01 08:32', method: '人脸', result: 'success' },
  { id: 'AR003', door: '食堂入口', time: '2026-10-01 12:00', method: '刷卡', result: 'success' },
  { id: 'AR004', door: '档案室', time: '2026-09-30 16:20', method: '二维码', result: 'denied', reason: '无该门点权限' },
  { id: 'AR005', door: '宿舍区西门', time: '2026-09-28 21:10', method: '人脸', result: 'offline', reason: '设备离线，稍后自动补传' },
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

// 考勤申请只认后台（WX_KQ_Apply 审批表），不再保留演示数据
export const initialAttendanceApplications: AttendanceApplication[] = [];

export const defaultNotificationSettings: Record<MessageType, boolean> = {
  recharge: true,
  consumption: true,
  order: true,
  visitor: true,
  attendance: true,
  face: true,
  system: true,
};
