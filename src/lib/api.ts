// 后端 API 客户端（H5 服务号 / 微信小程序 共用同一套后端接口）
import { currentHashPath, isAuthPath, isWeChatBrowser } from './auth';

const BASE = import.meta.env.VITE_API_BASE_URL+ '/api';

const TOKEN_META_KEY = 'ylt-token-meta';

export function getToken(): string {
  return localStorage.getItem('ylt-token') || '';
}
/**
 * 写入 token。expiresInSeconds 来自服务端登录响应的 expires_in。
 * 之后用「本机经过的时间」判断是否过期，而不是拿 JWT 的 exp 和本机绝对时间比：
 * 手机时钟若不准，按绝对时间判断会把刚签发的 token 误判成过期，导致反复授权。
 */
export function setToken(t: string, expiresInSeconds?: number): void {
  if (t) {
    localStorage.setItem('ylt-token', t);
    const ttl = Number(expiresInSeconds || 0);
    if (ttl > 0) {
      localStorage.setItem(TOKEN_META_KEY, JSON.stringify({ token: t, validUntil: Date.now() + ttl * 1000 }));
    } else {
      localStorage.removeItem(TOKEN_META_KEY);
    }
  } else {
    localStorage.removeItem('ylt-token');
    localStorage.removeItem(TOKEN_META_KEY);
  }
}

/**
 * 本地 token 是否仍可用（留 skewSeconds 秒余量）。
 * 没有签发信息（旧版本遗留 token）时返回 true，交给服务端 401 判定，避免误判导致死循环。
 */
export function isTokenValid(skewSeconds = 5): boolean {
  const token = getToken();
  if (!token) return false;
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(TOKEN_META_KEY);
    if (!raw) return true;
    const meta = JSON.parse(raw) as { token?: string; validUntil?: number };
    if (!meta || meta.token !== token || typeof meta.validUntil !== 'number') return true;
    return Date.now() + skewSeconds * 1000 < meta.validUntil;
  } catch {
    return true;
  }
}

// 401 并发去重：
// 首屏会同时发出 profile / 充值记录 / 订餐 / 消息等 7~8 个请求，token 过期时它们几乎同时 401。
// 旧逻辑每个 401 都会把「当前 hash」写入 ylt-wx-redirect，而第一个 401 已经把 hash 改成
// #/wx-oauth，于是后到的 401 把回跳目标覆盖成 /wx-oauth；授权成功后跳回授权页本身，
// 页面就永远停在「微信授权中…」（关闭再打开时 token 已写好，所以第二次正常）。
let authRedirecting = false;
let authRedirectAt = 0;

/** 登录/续期成功后复位，允许下一轮过期时再次跳授权 */
export function resetAuthRedirect(): void {
  authRedirecting = false;
  authRedirectAt = 0;
}

function redirectToAuth(): void {
  // 15 秒内只允许一次跳转；超时后允许重来，避免极端情况下标记卡死
  if (authRedirecting && Date.now() - authRedirectAt < 15000) return;
  authRedirecting = true;
  authRedirectAt = Date.now();

  const current = currentHashPath();
  const wechat = isWeChatBrowser();
  if (!isAuthPath(current)) {
    // 只记录真实的业务页面，且只记录一次（后续并发 401 不再覆盖）
    window.sessionStorage.setItem('ylt-wx-redirect', current);
    window.sessionStorage.setItem('ylt-redirect-after-bind', current);
  }
  if (wechat) {
    // 标记「正在续期」，路由守卫看到该标记时不抢跳绑定页
    window.sessionStorage.setItem('ylt-renewing', '1');
    if (!isAuthPath(current)) window.location.hash = '#/wx-oauth';
  } else if (current !== '/bind-account') {
    window.location.hash = '#/bind-account';
  }
}

export async function api(path: string, opts: any = {}): Promise<any> {
  //alert(BASE + path);
  const r = await fetch(BASE + path, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + getToken(),
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (r.status === 401) {
    // 401：服务端 JWT 已过期（Web.config 的 JwtExpireMinutes，正常 60 分钟）。
    // 旧逻辑每个 401 都直接改 hash，且并发 401 会互相覆盖回跳目标，最终跳回授权页本身。
    // 现在：清 token + 广播登录态失效，跳转交给 redirectToAuth 做并发去重与目标保护。
    setToken('');
    try { window.dispatchEvent(new CustomEvent('ylt:unauthorized')); } catch { /* ignore */ }
    redirectToAuth();
    throw new Error('登录已过期');
  }
  return r.json();
}

export const m = {
  // 认证（附加5：Person_No + Card_Password）
  login: (PersonNo: string, Password: string) =>
    api('/m/auth/login', { method: 'POST', body: { PersonNo, Password } }),
  sendSms: (mobile: string, scene: string) =>
    api(`/m/auth/smscode?mobile=${encodeURIComponent(mobile)}&scene=${scene}`),
  smsLogin: (mobile: string, code: string) =>
    api('/m/auth/smslogin', { method: 'POST', body: { Mobile: mobile, Code: code, Scene: 'h5' } }),
  wxLogin: (code: string) => api('/m/auth/wxlogin', { method: 'POST', body: { Code: code, Scene: 'h5' } }),
  bind: (b: any) => api('/m/auth/bind', { method: 'POST', body: { ...b, Scene: 'h5' } }),
  unbind: () => api('/m/auth/unbind', { method: 'POST', body: { Scene: 'h5' } }),
  profile: () => api('/m/auth/profile'),

  // 帐户
  changePwd: (oldPassword: string, newPassword: string) =>
    api('/m/account/changepwd', { method: 'POST', body: { oldPassword, newPassword } }),
  changePhone: (mobile: string, code: string) =>
    api('/m/account/changephone', { method: 'POST', body: { mobile, code } }),
  resetPwd: (mobile: string, code: string, idNumber: string, newPassword: string) =>
    api('/m/account/resetpwd', { method: 'POST', body: { mobile, code, idNumber, newPassword } }),
  // 挂失/解挂：校验卡密码并真实更新 ST_Card.Card_State
  lockCard: (action: 'lock' | 'unlock', password: string) =>
    api('/m/account/lockcard', { method: 'POST', body: { action, password } }),
  // 充值记录报表（ST_SupplyFund）：按充值时间区间查询，逻辑与 consumptions 一致
  rechargeRecords: (bgn = '', end = '') =>
    api(`/m/account/rechargerecords?bgn=${encodeURIComponent(bgn)}&end=${encodeURIComponent(end)}`),
  // 消费记录报表（XF_Consume）：按消费时间区间查询
  consumptions: (bgn = '', end = '', page = 1) =>
    api(`/m/account/consumptions?bgn=${encodeURIComponent(bgn)}&end=${encodeURIComponent(end)}&page=${page}`),

  // 充值（附加1：真实微信支付 JSAPI → 异步通知 → 查询兜底）
  rechargeCreate: (amount: number) => api('/m/recharge/create', { method: 'POST', body: { amount, scene: 'h5' } }),
  rechargeQuery: (outTradeNo: string, scene = 'h5') =>
    api('/m/recharge/query?outTradeNo=' + encodeURIComponent(outTradeNo) + '&scene=' + encodeURIComponent(scene)),

  // 通行记录（附加8）
  accessNormal: (bgn: string, end: string) => api(`/m/access/normal?bgn=${bgn}&end=${end}`),
  accessAbnorm: (bgn: string, end: string) => api(`/m/access/abnorm?bgn=${bgn}&end=${end}`),
  // 门列表（MJ_Door + MJ_Controller），供通行记录页做门筛选
  accessDoors: () => api('/m/access/doors'),
  // 当前人员的门禁权限（MJ_PsnDoorRight + MJ_Door + MJ_Controller + 时段）
  accessRights: () => api('/m/access/rights'),
  // 最近一次通行（MJ_NormalRecord 最新一条）
  accessLatest: () => api('/m/access/latest'),

  // 考勤（附加10/11）
  attendance: (bgn: string, end: string) => api(`/m/attendance/daily?bgn=${bgn}&end=${end}`),

  // 请假（附加9）
  leaveKinds: () => api('/m/leave/kinds'),
  leaveList: () => api('/m/leave/list'),
  leaveSubmit: (b: any) => api('/m/leave/submit', { method: 'POST', body: b }),

  // 付款码/通行码（附加3）
  payCode: () => api('/m/scancode/payment'),
  passCode: () => api('/m/scancode/pass'),

  // 人脸（附加12）
  faceUpload: (photo: string) => api('/m/face/upload', { method: 'POST', body: { photo } }),
  // 人脸采集状态：后台按 ST_PersonPhoto 是否有记录判定（有记录=已通过、无记录=未采集），并返回已采集照片 data URL
  faceStatus: () => api('/m/face/status'),

  // 食堂订餐（附加13）
  areas: () => api('/m/canteen/areas'),
  // 餐别：已关联 DC_Repast，返回 canOrder / orderDays / dcEndTime / deadlineTip / latestOrderDate
  repasts: () => api('/m/canteen/repasts'),
  // 菜谱：date 用于扣减「今天及以后、同一周几」的已预定份数，返回 remainCopies（-1=不限量）
  menu: (week: number, repastNo: string, areaNo: string, date = '') =>
    api(`/m/canteen/menu?week=${week}&repastNo=${encodeURIComponent(repastNo)}&areaNo=${encodeURIComponent(areaNo)}&date=${encodeURIComponent(date)}`),
  todayMenu: () => api('/m/canteen/today'),
  // 订餐模式：'1'=订餐扣款（下单即扣），'0'=消费扣款（取餐时扣）
  orderMode: () => api('/m/canteen/ordermode'),
  order: (b: any) => api('/m/canteen/order', { method: 'POST', body: b }),
  myOrders: (bgn = '', end = '', byMealDate = false) =>
    api(`/m/canteen/myorders?bgn=${encodeURIComponent(bgn)}&end=${encodeURIComponent(end)}&byMealDate=${byMealDate ? 'true' : 'false'}`),
  cancelOrder: (orderNo: string) => api('/m/canteen/cancel', { method: 'POST', body: { orderNo } }),

  // 消息中心（WX_Message）
  messageList: (page = 1) => api(`/m/message/list?page=${page}`),
  messageRead: (id: string) => api('/m/message/read', { method: 'POST', body: { id } }),
  messageReadAll: () => api('/m/message/readall', { method: 'POST', body: {} }),

  // 客服信息（ST_SysParam：SYS.ServicePhone / SYS.ServiceWindow / SYS.ServiceTime）
  serviceInfo: () => api('/m/service/info'),

  // 意见反馈（WX_Feedback）：提交后由服务端生成工单号并写消息中心回执
  feedbackSubmit: (b: { feedType: string; content: string; contact: string; images: string[]; scene?: string }) =>
    api('/m/feedback/submit', { method: 'POST', body: { scene: 'h5', ...b } }),
  // 我的反馈列表（含处理状态与回复）
  myFeedback: (page = 1) => api(`/m/feedback/list?page=${page}`),

  // 考勤补签/申诉（KQ_FillAttend / WX_KQ_Appeal）
  attapplyList: () => api('/m/attapply/list'),
  attapplyResignCount: () => api('/m/attapply/resign-count'),
  attapplyResign: (b: any) => api('/m/attapply/resign', { method: 'POST', body: b }),
  attapplyAppeal: (b: any) => api('/m/attapply/appeal', { method: 'POST', body: b }),
  // 撤回申请（仅待审批可用）
  attapplyCancel: (applyNo: string) => api('/m/attapply/cancel', { method: 'POST', body: { applyNo } }),

  // 访客预约（VisitorApply）
  visitorList: () => api('/m/visitor/list'),
  visitorSubmit: (b: any) => api('/m/visitor/submit', { method: 'POST', body: b }),
  // 被访人搜索（自助登记选被访人）
  visitorPersons: (keyword: string) => api(`/m/visitor/persons?keyword=${encodeURIComponent(keyword)}`),
  // 访客照片（按证件号取 dataURL）
  visitorPhoto: (applyNo: string) => api(`/m/visitor/photo?applyNo=${encodeURIComponent(applyNo)}`),
  // 审批通过：cardNo 为空则自动分配；指定则用那一张
  visitorApprove: (id: string, cardNo = '', noCard = false) => api('/m/visitor/approve', { method: 'POST', body: { id, cardNo, noCard } }),
  // 可用临时卡（未登记卡池时返回空）
  visitorCards: () => api('/m/visitor/cards'),
  visitorReject: (id: string, reason: string) => api('/m/visitor/reject', { method: 'POST', body: { id, reason } }),
  visitorSignOut: (id: string) => api('/m/visitor/signout', { method: 'POST', body: { id } }),
  // 到访签到（审批通过 ≠ 已到访，签到才写 check_intime）
  // 到访签到：cardNo 为空则自动分配（或只发二维码），指定则用那一张
  visitorCheckin: (id: string, cardNo = '', noCard = false) => api('/m/visitor/checkin', { method: 'POST', body: { id, cardNo, noCard } }),
  // 作废未到访的预约并回收临时卡
  visitorRevoke: (id: string) => api('/m/visitor/revoke', { method: 'POST', body: { id } }),
  // 凭证核验（前台/门点扫码，匿名）
  visitorVerify: (token: string) => api(`/m/visitor/verify?token=${encodeURIComponent(token)}`),
};

declare global {
  interface Window {
    WeixinJSBridge?: any;
  }
}
