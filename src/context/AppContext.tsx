import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isTokenValid, resetAuthRedirect, setToken, m as api } from '../lib/api';
import { invokeWechatPay, type WechatPayResult } from '../lib/wechatPay';
import { mapMealOrder } from '../lib/orderMap';
import {
  AccountInfo,
  AccountStatus,
  ApplicationStatus,
  AttendanceApplication,
  FaceStatus,
  MealOrder,
  MessageItem,
  MessageType,
  RechargeRecord,
  UserProfile,
  VisitorRecord,
  defaultNotificationSettings,
  initialAccount,
  initialAttendanceApplications,
  initialMessages,
  initialRechargeRecords,
  initialUser,
  initialVisitorRecords,
} from '../data/mock';

interface BindPayload {
  name: string;
  employeeNo: string;
  phone: string;
  password?: string;
  verifyCode?: string;
}

interface AppContextValue {
  isBound: boolean;
  user: UserProfile;
  account: AccountInfo;
  faceStatus: FaceStatus;
  faceRejectReason: string;
  facePhoto: string;
  messages: MessageItem[];
  notificationSettings: Record<MessageType, boolean>;
  rechargeRecords: RechargeRecord[];
  mealOrders: MealOrder[];
  visitorRecords: VisitorRecord[];
  attendanceApplications: AttendanceApplication[];
  unreadCount: number;
  bindAccount: (payload: BindPayload) => Promise<void>;
  unbindAccount: () => Promise<void>;
  updatePhone: (phone: string, code?: string) => Promise<void>;
  setAccountStatus: (status: AccountStatus) => void;
  recharge: (amount: number) => Promise<RechargeRecord>;
  deduct: (amount: number) => boolean;
  refund: (amount: number) => void;
  setFaceReviewing: () => void;
  setFaceResult: (approved: boolean, reason?: string) => void;
  markMessageRead: (id: string) => void;
  markAllMessagesRead: () => void;
  toggleNotification: (type: MessageType) => void;
  addMealOrder: (order: MealOrder) => void;
  cancelMealOrder: (order: MealOrder) => Promise<void>;
  addVisitorRecord: (record: VisitorRecord) => Promise<{ success: boolean; msg?: string; isSelf?: boolean; respondentName?: string }>;
  approveVisitor: (id: string, cardNo?: string, noCard?: boolean) => Promise<{ success: boolean; msg?: string; cardNo?: string; cardTip?: string }>;
  rejectVisitor: (id: string, reason: string) => Promise<void>;
  signOutVisitor: (id: string) => Promise<{ success: boolean; msg?: string }>;
  checkinVisitor: (id: string, cardNo?: string, noCard?: boolean) => Promise<{ success: boolean; msg?: string; cardNo?: string; cardTip?: string }>;
  revokeVisitor: (id: string) => Promise<{ success: boolean; msg?: string }>;
  addAttendanceApplication: (application: AttendanceApplication) => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshFaceStatus: () => Promise<void>;
  refreshRechargeRecords: () => Promise<void>;
  refreshMealOrders: (bgn?: string, end?: string) => Promise<void>;
  /** 刷新考勤申请列表；返回 false 表示拉取失败（用于区分「无记录」与「加载失败」） */
  refreshAttendanceApplications: () => Promise<boolean>;
  refreshVisitorRecords: () => Promise<void>;
  refreshMessages: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    if (Array.isArray(fallback) || typeof fallback !== 'object' || fallback === null) return parsed;
    return { ...fallback, ...(parsed as Record<string, unknown>) } as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 存储不可用时保持内存状态
  }
}

function nowText(): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AppProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  // 对接后端：以 JWT Token 作为绑定/登录态（附加5）；token 已过期时按未登录处理，
  // 由路由守卫直接走微信静默授权，避免先拿过期 token 打一批必然 401 的请求
  const [isBound, setIsBound] = useState<boolean>(() => isTokenValid());
  const [user, setUser] = useState<UserProfile>(() => readStorage('ylt-user', initialUser));
  const [account, setAccount] = useState<AccountInfo>(() => readStorage('ylt-account', initialAccount));
  // 人脸采集状态一律以后台 ST_PersonPhoto 为准（有记录=已通过、无记录=未采集），不用本地缓存兜底
  const [faceStatus, setFaceStatus] = useState<FaceStatus>('none');
  const [faceRejectReason, setFaceRejectReason] = useState<string>('');
  // 已采集的人脸照片（data URL，由 /m/face/status 返回；未采集时为空串）
  const [facePhoto, setFacePhoto] = useState<string>('');
  const [messages, setMessages] = useState<MessageItem[]>(() => readStorage('ylt-messages', initialMessages));
  const [notificationSettings, setNotificationSettings] = useState<Record<MessageType, boolean>>(() =>
    readStorage('ylt-notification-settings', defaultNotificationSettings),
  );
  const [rechargeRecords, setRechargeRecords] = useState<RechargeRecord[]>(initialRechargeRecords);
  const [mealOrders, setMealOrders] = useState<MealOrder[]>([]);
  const [visitorRecords, setVisitorRecords] = useState<VisitorRecord[]>(() =>
    readStorage('ylt-visitor-records', initialVisitorRecords),
  );
  const [attendanceApplications, setAttendanceApplications] = useState<AttendanceApplication[]>(initialAttendanceApplications);

  const updateUser = useCallback((next: UserProfile) => {
    setUser(next);
    writeStorage('ylt-user', next);
  }, []);
  const updateAccount = useCallback((next: AccountInfo) => {
    setAccount(next);
    writeStorage('ylt-account', next);
  }, []);

  const updateMessages = useCallback((next: MessageItem[]) => {
    setMessages(next);
    writeStorage('ylt-messages', next);
  }, []);

  const updateRechargeRecords = useCallback((next: RechargeRecord[]) => {
    setRechargeRecords(next);
  }, []);

  const updateMealOrders = useCallback((next: MealOrder[]) => {
    setMealOrders(next);
  }, []);

  const updateVisitorRecords = useCallback((next: VisitorRecord[]) => {
    setVisitorRecords(next);
    writeStorage('ylt-visitor-records', next);
  }, []);

  const updateAttendanceApplications = useCallback((next: AttendanceApplication[]) => {
    setAttendanceApplications(next);
  }, []);

  // ---------- 后端数据同步 ----------
  const refreshProfile = useCallback(async (): Promise<void> => {
    try {
      const p = await api.profile();
      if (!p || p.personId === undefined) return;
      updateUser({
        name: p.name || '',
        // 部门名称取后台 ST_Department.Dept_Name；职称取 ST_Person.Title（均由 /m/auth/profile 返回）
        department: p.department || user.department,
        title: p.title || '',
        employeeNo: p.personNo || '',
        phone: (p.mobile || '').replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2'),
        idCard: p.idNumber || '',
      });
      updateAccount({
        balance: Number(p.balance || 0),
        pendingAmount: account.pendingAmount,
        cardNo: p.cardNo || '',
        status: (p.cardState === 0 || p.cardState === undefined) ? 'normal' : 'locked',
        updatedAt: (p.updateTime as string) || account.updatedAt,
      });
    } catch {
      // 后端不可用时保留本地缓存
    }
  }, [account.pendingAmount, updateAccount, updateUser, user.department, user.title]);

  // 人脸采集状态：按后台 ST_PersonPhoto 是否有记录判定（有记录=已通过、无记录=未采集），并取回已采集照片
  const refreshFaceStatus = useCallback(async (): Promise<void> => {
    try {
      const res = await api.faceStatus();
      if (!res || res.collected === undefined) return;
      setFaceStatus(res.collected ? 'approved' : 'none');
      setFaceRejectReason('');
      setFacePhoto(res.hasPhoto && res.photo ? String(res.photo) : '');
    } catch {
      // 后端不可用时保留当前内存状态
    }
  }, []);

  const refreshRechargeRecords = useCallback(async (bgn = '', end = ''): Promise<void> => {
    try {
      const rows = await api.rechargeRecords(bgn, end);
      if (!Array.isArray(rows)) return;
      updateRechargeRecords(rows.map((r: any) => ({
        id: String(r.id),
        amount: Number(r.amount),
        // 渠道由后台按 Out_Trade_No 判定：非空=微信充值，空=刷卡充值
        channel: r.channel || '其他充值',
        status: 'paid' as const,
        time: (r.time || '').replace('T', ' ').substring(0, 16),
        orderNo: r.outTradeNo || '-',
        merchantNo: r.outTradeNo || '',
        progress: r.remark || '支付成功，平台已入账',
        beforeFund: Number(r.beforeFund || 0),
        balance: Number(r.balance || 0),
      })));
    } catch { /* 忽略 */ }
  }, [updateRechargeRecords]);

  const refreshMealOrders = useCallback(async (bgn = '', end = ''): Promise<void> => {
    try {
      const rows = await api.myOrders(bgn, end);
      // 仅以后台数据为准；返回异常时清空，避免保留上一次的陈旧数据
      if (!Array.isArray(rows)) { updateMealOrders([]); return; }
      updateMealOrders(rows.map(mapMealOrder));
    } catch {
      // 请求失败同样清空，不保留演示/陈旧订单
      updateMealOrders([]);
    }
  }, [updateMealOrders]);

  const refreshAttendanceApplications = useCallback(async (): Promise<boolean> => {
    // 三类申请（补签/请假/申诉）统一来自审批表 WX_KQ_Apply：
    // 审批通过后才会写 KQ_SupplyTime / KQ_Leave，所以这里不再单独查 KQ_Leave，避免重复与状态错乱。
    try {
      const rows = await api.attapplyList();
      if (!Array.isArray(rows)) return false;
      const list: AttendanceApplication[] = rows.map((o: any) => ({
        id: String(o.id),
        applyNo: o.applyNo || '',
        type: (o.type === '补签' ? '补签' : o.type === '请假' ? '请假' : '申诉') as '补签' | '请假' | '申诉',
        title: o.title || o.type,
        dateRange: o.dateRange || '',
        reason: o.reason || '',
        status: (o.status === 'approved' ? 'approved'
          : o.status === 'rejected' ? 'rejected'
            : o.status === 'cancelled' ? 'cancelled' : 'pending') as ApplicationStatus,
        submitTime: o.submitTime || '',
        canCancel: !!o.canCancel,
        auditRemark: o.auditRemark || '',
      }));
      list.sort((x, y) => (x.submitTime < y.submitTime ? 1 : -1));
      updateAttendanceApplications(list);
      return true;
    } catch {
      // 拉取失败（表不存在 / 字段映射异常 / 网络）要能被页面区分出来，
      // 否则用户看到的是「暂无记录」，会把接口错误当成没数据。
      return false;
    }
  }, [updateAttendanceApplications]);

  const refreshVisitorRecords = useCallback(async (): Promise<void> => {
    try {
      const rows = await api.visitorList();
      if (!Array.isArray(rows)) return;
      updateVisitorRecords(rows.map((v: any) => ({
        id: String(v.id),
        visitorName: v.visitorName || '',
        visitorPhone: v.visitorPhone || '',
        idCard: v.idCard || '',
        company: v.company || '',
        department: v.department || '',
        respondentName: v.respondentName || '',
        reason: v.reason || '',
        visitDate: v.visitDate || '',
        visitTime: v.visitTime || '',
        companions: Number(v.companions || 0),
        plate: v.plate || '',
        status: v.status || 'pending',
        applyTime: v.applyTime || '',
        passCode: v.passCode || '',
        cardNo: v.cardNo || '',
        visitToken: v.visitToken || '',
        checkinTime: v.checkinTime || '',
        rejectReason: v.rejectReason || '',
        signOutTime: v.signOutTime || '',
        visitorType: v.visitorType || '',
        carryItems: v.carryItems || '',
        hasPhoto: !!v.hasPhoto,
        canHandle: !!v.canHandle,
        submittedByMe: !!v.submittedByMe,
      })));
    } catch { /* 忽略 */ }
  }, [updateVisitorRecords]);

  const refreshMessages = useCallback(async (): Promise<void> => {
    try {
      const rows = await api.messageList();
      if (!Array.isArray(rows)) return;
      updateMessages(rows.map((x: any) => ({
        id: String(x.id),
        type: (x.type || 'system') as MessageType,
        title: x.title || '',
        content: x.content || '',
        time: x.time || '',
        read: !!x.read,
      })));
    } catch { /* 忽略 */ }
  }, [updateMessages]);

  // 统一的业务数据同步：登录成功 / 静默续期成功后必须再跑一次。
  // 旧逻辑只在 AppProvider 首次挂载时同步，而微信 OAuth 回跳时首屏还没有 token，
  // 那批请求全部 401；授权成功后又没有任何地方补拉数据，页面只能关掉重开才正常。
  const syncBackendData = useCallback((): void => {
    if (!isTokenValid()) return;
    void refreshProfile();
    void refreshRechargeRecords();
    void refreshMealOrders();
    void refreshAttendanceApplications();
    void refreshVisitorRecords();
    void refreshMessages();
    void refreshFaceStatus();
  }, [
    refreshAttendanceApplications,
    refreshFaceStatus,
    refreshMealOrders,
    refreshMessages,
    refreshProfile,
    refreshRechargeRecords,
    refreshVisitorRecords,
  ]);

  useEffect(() => {
    syncBackendData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 登录态失效/恢复广播：
  //   api.ts 收到 401 → 派发 ylt:unauthorized（isBound 置 false）
  //   WxOauth 续期成功 → 派发 ylt:authorized（isBound 置回 true 并补拉数据）
  useEffect(() => {
    const onUnauthorized = (): void => setIsBound(false);
    const onAuthorized = (): void => {
      setIsBound(true);
      syncBackendData();
    };
    window.addEventListener('ylt:unauthorized', onUnauthorized);
    window.addEventListener('ylt:authorized', onAuthorized);
    return () => {
      window.removeEventListener('ylt:unauthorized', onUnauthorized);
      window.removeEventListener('ylt:authorized', onAuthorized);
    };
  }, [syncBackendData]);

// ---------- 绑定 / 解绑（附加7：更新 ST_Person.OpenID，支持解绑） ----------
const bindAccount = useCallback(async (payload: BindPayload): Promise<void> => {
    const wxOpenId = sessionStorage.getItem('ylt-wx-openid') || '';
    const wxUnionId = sessionStorage.getItem('ylt-wx-unionid') || '';
    const wxCode = (typeof window !== 'undefined' && sessionStorage.getItem('ylt-wx-code')) || '';
    let res = await api.bind({
        PersonNo: payload.employeeNo,
        Password: payload.password || '',
        Mobile: payload.phone,
        SmsCode: payload.verifyCode || '',
        OpenId: wxOpenId,      // 改为传 OpenId
        UnionId: wxUnionId,
        Code: wxCode,
      });
     
    if (!res.success && res.msg && res.msg.indexOf('微信身份获取失败') >= 0) {
       if (payload.password)
        res = await api.login(payload.employeeNo, payload.password);
      else res = await api.smsLogin(payload.phone, payload.verifyCode || '');
    }
    
    if (!res || !res.success) throw new Error((res && res.msg) || '绑定失败');

    setToken(res.access_token || '', Number(res.expires_in) || 0);
    resetAuthRedirect();
    setIsBound(true);
    window.sessionStorage.removeItem('ylt-oauth-tried');
    writeStorage('ylt-bound', true);
    if (res.user) {
      updateUser({
        ...user,
        name: res.user.name || payload.name || user.name,
        employeeNo: res.user.personNo || payload.employeeNo,
      });
    }
    // 绑定成功后清除微信临时凭证
    sessionStorage.removeItem('ylt-wx-openid');
    sessionStorage.removeItem('ylt-wx-unionid');
    sessionStorage.removeItem('ylt-wx-code');
    await refreshProfile();
    await refreshRechargeRecords();
  }, [refreshProfile, refreshRechargeRecords, updateUser, user]);

  const unbindAccount = useCallback(async (): Promise<void> => {
    try {
      await api.unbind();
    } catch {
      // 后端不可达也允许本地解绑
    }
    setToken('');
    setIsBound(false);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('ylt-bound');
      window.localStorage.removeItem('ylt-user');
      window.localStorage.removeItem('ylt-account');
    }
    setUser(initialUser);
    setAccount(initialAccount);
  }, []);

  const updatePhone = useCallback(async (phone: string, code?: string): Promise<void> => {
    if (code) {
      const res = await api.changePhone(phone, code);
      if (!res.success) throw new Error(res.msg || '手机号修改失败');
    }
    const next = { ...user, phone };
    updateUser(next);
  }, [updateUser, user]);

  const setAccountStatus = useCallback((status: AccountStatus) => {
    const next = { ...account, status };
    updateAccount(next);
  }, [account, updateAccount]);

  // ---------- 充值（附加1：真实微信支付 JSAPI → 异步通知 → 查询兜底） ----------
  const recharge = useCallback(async (amount: number): Promise<RechargeRecord> => {
    const created = await api.rechargeCreate(amount);
    if (!created.success) throw new Error(created.msg || '创建支付订单失败');
    if (!created.payParams) throw new Error('微信支付参数缺失，请重试');

    const record: RechargeRecord = {
      id: created.outTradeNo,
      amount,
      channel: '微信支付',
      status: 'pending',
      time: nowText(),
      orderNo: created.outTradeNo,
      merchantNo: '',
      progress: '已下单，等待支付',
      beforeFund: 0,
      balance: 0,
    };
    updateRechargeRecords([record, ...rechargeRecords]);

    // 微信内调起支付（服务号 JSAPI）；必须等 WeixinJSBridgeReady，不能因 bridge 未就绪直接跳过
    let payResult: WechatPayResult;
    try {
      payResult = await invokeWechatPay(created.payParams as Record<string, any>);
    } catch (error) {
      updateRechargeRecords(rechargeRecords.filter((r) => r.id !== record.id));
      throw error;
    }
    if (payResult === 'cancel') {
      updateRechargeRecords(rechargeRecords.filter((r) => r.id !== record.id));
      throw new Error('已取消支付');
    }

    // 查询兜底：异步通知可能先于/晚于查询到达；即使前端回调 fail 也查一次，防止「已扣款但提示失败」
    let finalState = '';
    const attempts = payResult === 'ok' ? 8 : 2;
    for (let i = 0; i < attempts; i += 1) {
      await new Promise((r) => window.setTimeout(r, i === 0 ? 800 : 1500));
      const q = await api.rechargeQuery(created.outTradeNo).catch(() => null);
      finalState = (q && q.tradeState) || '';
      if (finalState === 'SUCCESS' || finalState === 'CLOSED') break;
    }
    if (finalState !== 'SUCCESS') {
      updateRechargeRecords(rechargeRecords.filter((r) => r.id !== record.id));
      // 不把「通知延迟」误报为支付失败：让用户稍后去充值记录确认
      throw new Error(finalState === 'CLOSED' ? '支付已关闭' : '支付结果确认中，请稍后在充值记录中查看');
    }

    const paidRecord: RechargeRecord = { ...record, status: 'paid', progress: '支付成功，平台已入账' };
    updateRechargeRecords([paidRecord, ...rechargeRecords.filter((r) => r.id !== record.id)]);
    await refreshProfile();
    return paidRecord;
  }, [rechargeRecords, refreshProfile, updateRechargeRecords]);

  const deduct = useCallback((amount: number): boolean => {
    if (account.balance < amount || account.status !== 'normal') return false;
    const next = {
      ...account,
      balance: Number((account.balance - amount).toFixed(2)),
      updatedAt: nowText(),
    };
    updateAccount(next);
    return true;
  }, [account, updateAccount]);

  const refund = useCallback((amount: number) => {
    const next = {
      ...account,
      balance: Number((account.balance + amount).toFixed(2)),
      updatedAt: nowText(),
    };
    updateAccount(next);
  }, [account, updateAccount]);

  const setFaceReviewing = useCallback(() => {
    setFaceStatus('reviewing');
  }, []);

  const setFaceResult = useCallback((approved: boolean, reason?: string) => {
    const nextStatus: FaceStatus = approved ? 'approved' : 'rejected';
    const nextReason = approved ? '' : reason || '照片不符合要求';
    setFaceStatus(nextStatus);
    setFaceRejectReason(nextReason);
  }, []);

  const markMessageRead = useCallback((id: string) => {
    updateMessages(messages.map((item) => (item.id === id ? { ...item, read: true } : item)));
    api.messageRead(id).then(() => refreshMessages()).catch(() => {});
  }, [messages, refreshMessages, updateMessages]);

  const markAllMessagesRead = useCallback(() => {
    updateMessages(messages.map((item) => ({ ...item, read: true })));
    api.messageReadAll().then(() => refreshMessages()).catch(() => {});
  }, [messages, refreshMessages, updateMessages]);

  const toggleNotification = useCallback((type: MessageType) => {
    const next = { ...notificationSettings, [type]: !notificationSettings[type] };
    setNotificationSettings(next);
    writeStorage('ylt-notification-settings', next);
  }, [notificationSettings]);

  const addMealOrder = useCallback((order: MealOrder) => {
    updateMealOrders([order, ...mealOrders]);
  }, [mealOrders, updateMealOrders]);

  const cancelMealOrder = useCallback(async (order: MealOrder): Promise<void> => {
    if (!order || order.status !== 'ordered') return;
    const res = await api.cancelOrder(order.orderNo);
    if (!res.success) throw new Error(res.msg || '取消失败');
    // 消费扣款模式（DC.Solution=0）订餐时未扣钱，退订只取消订单、不退款，
    // 状态记为 cancelled 而非 refunded，避免界面出现"退款已退回余额"的假象
    const wasRefunded = res.refunded !== false && order.mode !== '消费扣款';
    // 全局列表仅作订餐页「重复订餐」校验用，命中才同步更新
    updateMealOrders(mealOrders.map((item) => (item.id === order.id
      ? { ...item, status: wasRefunded ? 'refunded' : 'cancelled' }
      : item)));
    if (wasRefunded) refund(order.amount);
    await refreshProfile();
  }, [mealOrders, refund, refreshProfile, updateMealOrders]);

  // ---------- 访客预约（VisitorApply + VisitorUser） ----------
  // 一律以后端结果为准：不做本地乐观插入，避免"提交成功但没落库"的假象
  const addVisitorRecord = useCallback(async (record: VisitorRecord): Promise<{ success: boolean; msg?: string; isSelf?: boolean; respondentName?: string }> => {
    try {
      const res = await api.visitorSubmit({
        visitorName: record.visitorName,
        visitorPhone: record.visitorPhone,      // 明文提交，后端入库、返回时脱敏
        idCard: record.idCard,
        company: record.company,
        reason: record.reason,
        visitDate: record.visitDate,
        visitTime: record.visitTime,
        companions: record.companions,
        plate: record.plate,
        visitorType: record.visitorType || '临时访客',
        carryItems: record.carryItems || '',
        personId: record.respondentId,          // 被访人（不传则默认当前登录人）
        photo: record.photo || '',
      });
      if (!res || !res.success) return { success: false, msg: (res && res.msg) || '提交失败' };
      await refreshVisitorRecords();
      return { success: true, isSelf: res.isSelf !== false, respondentName: res.respondentName || '' };
    } catch (e) {
      return { success: false, msg: (e as Error).message || '网络异常，请重试' };
    }
  }, [refreshVisitorRecords]);

  const approveVisitor = useCallback(async (id: string, cardNo = '', noCard = false): Promise<{ success: boolean; msg?: string; cardNo?: string; cardTip?: string }> => {
    try {
      const res = await api.visitorApprove(id, cardNo, noCard);
      if (!res || !res.success) return { success: false, msg: (res && res.msg) || '审批失败' };
      await refreshVisitorRecords();
      return { success: true, cardNo: res.cardNo, cardTip: res.cardTip };
    } catch (e) {
      return { success: false, msg: (e as Error).message || '网络异常，请重试' };
    }
  }, [refreshVisitorRecords]);

  const rejectVisitor = useCallback(async (id: string, reason: string): Promise<void> => {
    try {
      await api.visitorReject(id, reason);
      await refreshVisitorRecords();
    } catch {
      /* 失败保持原状态，由页面提示 */
    }
  }, [refreshVisitorRecords]);

  // 到访签到：写 check_intime（签离的前置条件）
  const checkinVisitor = useCallback(async (id: string, cardNo = '', noCard = false): Promise<{ success: boolean; msg?: string; cardNo?: string; cardTip?: string }> => {
    try {
      const res = await api.visitorCheckin(id, cardNo, noCard);
      if (!res || !res.success) return { success: false, msg: (res && res.msg) || '签到失败' };
      await refreshVisitorRecords();
      return { success: true, cardNo: res.cardNo, cardTip: res.cardTip };
    } catch (e) {
      return { success: false, msg: (e as Error).message || '网络异常，请重试' };
    }
  }, [refreshVisitorRecords]);

  // 作废：访客没来（过期未签到），回收临时卡
  const revokeVisitor = useCallback(async (id: string): Promise<{ success: boolean; msg?: string }> => {
    try {
      const res = await api.visitorRevoke(id);
      if (!res || !res.success) return { success: false, msg: (res && res.msg) || '作废失败' };
      await refreshVisitorRecords();
      return { success: true };
    } catch (e) {
      return { success: false, msg: (e as Error).message || '网络异常，请重试' };
    }
  }, [refreshVisitorRecords]);

  const signOutVisitor = useCallback(async (id: string): Promise<{ success: boolean; msg?: string }> => {
    try {
      const res = await api.visitorSignOut(id);
      if (!res || !res.success) return { success: false, msg: (res && res.msg) || '签离失败' };
      await refreshVisitorRecords();
      return { success: true };
    } catch (e) {
      return { success: false, msg: (e as Error).message || '网络异常，请重试' };
    }
  }, [refreshVisitorRecords]);

  // 考勤申请统一入口：按类型分发到 请假/补签/申诉 后端接口（乐观更新 + 成功后刷新）
  const addAttendanceApplication = useCallback(async (application: AttendanceApplication): Promise<void> => {
    updateAttendanceApplications([application, ...attendanceApplications]);
    try {
      let ok = true;
      if (application.type === '请假') {
        const res = await api.leaveSubmit({ kindNo: application.title, timeBgn: '', timeEnd: '', remark: application.reason });
        ok = res.success;
      } else if (application.type === '补签') {
        const parts = (application.dateRange || '').split(' ');
        const res = await api.attapplyResign({
          date: parts[0] || application.dateRange,
          time: parts[1] || '08:30',
          clockType: application.title.indexOf('下班') >= 0 ? '下班' : '上班',
          reason: application.reason,
        });
        ok = res.success;
      } else {
        const res = await api.attapplyAppeal({
          date: application.dateRange,
          appealType: application.title,
          reason: application.reason,
        });
        ok = res.success;
      }
      if (ok) await refreshAttendanceApplications();
    } catch { /* 离线时保留本地记录 */ }
  }, [attendanceApplications, refreshAttendanceApplications, updateAttendanceApplications]);

  const unreadCount = useMemo(() => messages.filter((item) => !item.read).length, [messages]);

  const value = useMemo<AppContextValue>(() => ({
    isBound,
    user,
    account,
    faceStatus,
    faceRejectReason,
    facePhoto,
    messages,
    notificationSettings,
    rechargeRecords,
    mealOrders,
    visitorRecords,
    attendanceApplications,
    unreadCount,
    bindAccount,
    unbindAccount,
    updatePhone,
    setAccountStatus,
    recharge,
    deduct,
    refund,
    setFaceReviewing,
    setFaceResult,
    markMessageRead,
    markAllMessagesRead,
    toggleNotification,
    addMealOrder,
    cancelMealOrder,
    addVisitorRecord,
    approveVisitor,
    rejectVisitor,
    checkinVisitor,
    revokeVisitor,
    signOutVisitor,
    addAttendanceApplication,
    refreshProfile,
    refreshFaceStatus,
    refreshRechargeRecords,
    refreshMealOrders,
    refreshAttendanceApplications,
    refreshVisitorRecords,
    refreshMessages,
  }), [
    isBound,
    user,
    account,
    faceStatus,
    faceRejectReason,
    facePhoto,
    messages,
    notificationSettings,
    rechargeRecords,
    mealOrders,
    visitorRecords,
    attendanceApplications,
    unreadCount,
    bindAccount,
    unbindAccount,
    updatePhone,
    setAccountStatus,
    recharge,
    deduct,
    refund,
    setFaceReviewing,
    setFaceResult,
    markMessageRead,
    markAllMessagesRead,
    toggleNotification,
    addMealOrder,
    cancelMealOrder,
    addVisitorRecord,
    approveVisitor,
    rejectVisitor,
    checkinVisitor,
    revokeVisitor,
    signOutVisitor,
    addAttendanceApplication,
    refreshProfile,
    refreshFaceStatus,
    refreshRechargeRecords,
    refreshMealOrders,
    refreshAttendanceApplications,
    refreshVisitorRecords,
    refreshMessages,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
