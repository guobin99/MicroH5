// 微信授权 / 登录态跳转相关的纯函数，供 api.ts、路由守卫、授权中转页共用。

export function isWeChatBrowser(): boolean {
  return typeof navigator !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent);
}

/** 授权中转页/绑定页自身不能作为登录后的回跳目标，否则会原地打转 */
export function isAuthPath(value: string): boolean {
  const path = (value || '').split('?')[0];
  return path === '/wx-oauth' || path === '/bind-account';
}

/**
 * 规范化回跳目标：
 * - 只接受 hash 路由内部路径（必须以 / 开头），避免把外部地址当跳转目标；
 * - 授权页/绑定页一律回首页，避免「登录成功 → 回到授权页 → 再授权」的死循环。
 */
export function normalizeRedirect(value: string | null | undefined): string {
  const raw = (value || '').trim();
  if (!raw || raw.charAt(0) !== '/' || raw.indexOf('//') === 0) return '/';
  return isAuthPath(raw) ? '/' : raw;
}

/** 当前 hash 路由（不含 #），如 '/home?tab=1' */
export function currentHashPath(): string {
  if (typeof window === 'undefined') return '/';
  return (window.location.hash || '#/').replace(/^#/, '') || '/';
}
