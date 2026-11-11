import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  AccountInfo,
  AccountStatus,
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
  initialMealOrders,
  initialMessages,
  initialRechargeRecords,
  initialUser,
  initialVisitorRecords,
} from '../data/mock';

interface BindPayload {
  name: string;
  employeeNo: string;
  phone: string;
}

interface AppContextValue {
  isBound: boolean;
  user: UserProfile;
  account: AccountInfo;
  faceStatus: FaceStatus;
  faceRejectReason: string;
  messages: MessageItem[];
  notificationSettings: Record<MessageType, boolean>;
  rechargeRecords: RechargeRecord[];
  mealOrders: MealOrder[];
  visitorRecords: VisitorRecord[];
  attendanceApplications: AttendanceApplication[];
  unreadCount: number;
  bindAccount: (payload: BindPayload) => void;
  unbindAccount: () => void;
  updatePhone: (phone: string) => void;
  setAccountStatus: (status: AccountStatus) => void;
  recharge: (amount: number) => RechargeRecord;
  deduct: (amount: number) => boolean;
  refund: (amount: number) => void;
  setFaceReviewing: () => void;
  setFaceResult: (approved: boolean, reason?: string) => void;
  markMessageRead: (id: string) => void;
  markAllMessagesRead: () => void;
  toggleNotification: (type: MessageType) => void;
  addMealOrder: (order: MealOrder) => void;
  cancelMealOrder: (id: string) => void;
  addVisitorRecord: (record: VisitorRecord) => void;
  approveVisitor: (id: string) => void;
  rejectVisitor: (id: string, reason: string) => void;
  signOutVisitor: (id: string) => void;
  addAttendanceApplication: (application: AttendanceApplication) => void;
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
    // 存储不可用时保持内存状态，不影响当前会话使用
  }
}

function nowText(): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function makeOrderNo(prefix: string): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14);
  return `${prefix}${stamp}${Math.floor(Math.random() * 9000 + 1000)}`;
}

export function AppProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [isBound, setIsBound] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const bound = window.localStorage.getItem('ylt-bound') !== 'false';
    const expiresAt = Number(window.sessionStorage.getItem('ylt-session-expires-at') || 0);
    return bound && (expiresAt === 0 || expiresAt > Date.now());
  });
  const [user, setUser] = useState<UserProfile>(() => readStorage('ylt-user', initialUser));
  const [account, setAccount] = useState<AccountInfo>(() => readStorage('ylt-account', initialAccount));
  const [faceStatus, setFaceStatus] = useState<FaceStatus>(() =>
    (typeof window !== 'undefined' && (window.localStorage.getItem('ylt-face-status') as FaceStatus)) || 'approved',
  );
  const [faceRejectReason, setFaceRejectReason] = useState<string>(() =>
    typeof window !== 'undefined' ? window.localStorage.getItem('ylt-face-reason') || '' : '',
  );
  const [messages, setMessages] = useState<MessageItem[]>(() => readStorage('ylt-messages', initialMessages));
  const [notificationSettings, setNotificationSettings] = useState<Record<MessageType, boolean>>(() =>
    readStorage('ylt-notification-settings', defaultNotificationSettings),
  );
  const [rechargeRecords, setRechargeRecords] = useState<RechargeRecord[]>(() =>
    readStorage('ylt-recharge-records', initialRechargeRecords),
  );
  const [mealOrders, setMealOrders] = useState<MealOrder[]>(() => readStorage('ylt-meal-orders', initialMealOrders));
  const [visitorRecords, setVisitorRecords] = useState<VisitorRecord[]>(() =>
    readStorage('ylt-visitor-records', initialVisitorRecords),
  );
  const [attendanceApplications, setAttendanceApplications] = useState<AttendanceApplication[]>(() =>
    readStorage('ylt-attendance-applications', initialAttendanceApplications),
  );

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
    writeStorage('ylt-recharge-records', next);
  }, []);

  const updateMealOrders = useCallback((next: MealOrder[]) => {
    setMealOrders(next);
    writeStorage('ylt-meal-orders', next);
  }, []);

  const updateVisitorRecords = useCallback((next: VisitorRecord[]) => {
    setVisitorRecords(next);
    writeStorage('ylt-visitor-records', next);
  }, []);

  const updateAttendanceApplications = useCallback((next: AttendanceApplication[]) => {
    setAttendanceApplications(next);
    writeStorage('ylt-attendance-applications', next);
  }, []);

  const bindAccount = useCallback((payload: BindPayload) => {
    updateUser({
      ...initialUser,
      name: payload.name,
      employeeNo: payload.employeeNo,
      phone: payload.phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2'),
    });
    setIsBound(true);
    writeStorage('ylt-bound', true);
    window.sessionStorage.setItem('ylt-session-expires-at', String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  }, [updateUser]);

  const unbindAccount = useCallback(() => {
    setIsBound(false);
    writeStorage('ylt-bound', false);
    window.sessionStorage.removeItem('ylt-session-expires-at');
  }, []);

  const updatePhone = useCallback((phone: string) => {
    const masked = phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
    updateUser({ ...user, phone: masked });
  }, [updateUser, user]);

  const setAccountStatus = useCallback((status: AccountStatus) => {
    updateAccount({ ...account, status, updatedAt: nowText() });
  }, [account, updateAccount]);

  const recharge = useCallback((amount: number): RechargeRecord => {
    const record: RechargeRecord = {
      id: `RR${Date.now()}`,
      amount,
      channel: '微信支付',
      status: 'paid',
      time: nowText(),
      orderNo: makeOrderNo('R'),
      merchantNo: `420000${Math.floor(Math.random() * 10 ** 12)}`,
      progress: '支付成功，平台已入账',
    };
    updateAccount({ ...account, balance: account.balance + amount, updatedAt: nowText() });
    updateRechargeRecords([record, ...rechargeRecords]);
    return record;
  }, [account, rechargeRecords, updateAccount, updateRechargeRecords]);

  const deduct = useCallback((amount: number): boolean => {
    if (account.status !== 'normal' || account.balance < amount) return false;
    updateAccount({ ...account, balance: account.balance - amount, updatedAt: nowText() });
    return true;
  }, [account, updateAccount]);

  const refund = useCallback((amount: number) => {
    updateAccount({ ...account, balance: account.balance + amount, updatedAt: nowText() });
  }, [account, updateAccount]);

  const setFaceReviewing = useCallback(() => {
    setFaceStatus('reviewing');
    writeStorage('ylt-face-status', 'reviewing');
  }, []);

  const setFaceResult = useCallback((approved: boolean, reason = '') => {
    const status: FaceStatus = approved ? 'approved' : 'rejected';
    setFaceStatus(status);
    setFaceRejectReason(reason);
    writeStorage('ylt-face-status', status);
    writeStorage('ylt-face-reason', reason);
  }, []);

  const markMessageRead = useCallback((id: string) => {
    updateMessages(messages.map((item) => (item.id === id ? { ...item, read: true } : item)));
  }, [messages, updateMessages]);

  const markAllMessagesRead = useCallback(() => {
    updateMessages(messages.map((item) => ({ ...item, read: true })));
  }, [messages, updateMessages]);

  const toggleNotification = useCallback((type: MessageType) => {
    const next = { ...notificationSettings, [type]: !notificationSettings[type] };
    setNotificationSettings(next);
    writeStorage('ylt-notification-settings', next);
  }, [notificationSettings]);

  const addMealOrder = useCallback((order: MealOrder) => {
    updateMealOrders([order, ...mealOrders]);
  }, [mealOrders, updateMealOrders]);

  const cancelMealOrder = useCallback((id: string) => {
    const target = mealOrders.find((item) => item.id === id);
    if (!target || target.status !== 'ordered') return;
    updateMealOrders(mealOrders.map((item) => (item.id === id ? { ...item, status: 'refunded' } : item)));
    refund(target.amount);
  }, [mealOrders, refund, updateMealOrders]);

  const addVisitorRecord = useCallback((record: VisitorRecord) => {
    updateVisitorRecords([record, ...visitorRecords]);
  }, [updateVisitorRecords, visitorRecords]);

  const approveVisitor = useCallback((id: string) => {
    updateVisitorRecords(visitorRecords.map((item) => (
      item.id === id ? { ...item, status: 'approved', passCode: `VIS-${Math.random().toString(36).slice(2, 8).toUpperCase()}` } : item
    )));
  }, [updateVisitorRecords, visitorRecords]);

  const rejectVisitor = useCallback((id: string, reason: string) => {
    updateVisitorRecords(visitorRecords.map((item) => (
      item.id === id ? { ...item, status: 'rejected', rejectReason: reason } : item
    )));
  }, [updateVisitorRecords, visitorRecords]);

  const signOutVisitor = useCallback((id: string) => {
    updateVisitorRecords(visitorRecords.map((item) => (
      item.id === id ? { ...item, status: 'completed', signOutTime: nowText() } : item
    )));
  }, [updateVisitorRecords, visitorRecords]);

  const addAttendanceApplication = useCallback((application: AttendanceApplication) => {
    updateAttendanceApplications([application, ...attendanceApplications]);
  }, [attendanceApplications, updateAttendanceApplications]);

  const unreadCount = useMemo(() => messages.filter((item) => !item.read).length, [messages]);

  const value = useMemo<AppContextValue>(() => ({
    isBound,
    user,
    account,
    faceStatus,
    faceRejectReason,
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
    signOutVisitor,
    addAttendanceApplication,
  }), [
    isBound,
    user,
    account,
    faceStatus,
    faceRejectReason,
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
    signOutVisitor,
    addAttendanceApplication,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
