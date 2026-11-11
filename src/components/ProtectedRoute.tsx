import React from 'react';
import { Redirect, useLocation } from 'wouter';
import { isTokenValid } from '../lib/api';
import { isAuthPath, isWeChatBrowser } from '../lib/auth';

export default function ProtectedRoute({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [location] = useLocation();
  // 以「token 是否存在且未过期」为准，而不是只看 isBound 布尔值：
  // OAuth 续期成功后是先写 token 再改 hash，若用 React 状态判断，
  // 路由切换瞬间可能还是 false，会被守卫抢跳到绑定页，形成授权死循环。
  const authed = isTokenValid();

  if (!authed) {
    // 在渲染阶段同步记录原始目标（不能放 useEffect：Redirect 会先一步改路由，
    // effect 可能来不及执行，导致回跳目标沿用上一次会话的旧值）。
    // 授权页/绑定页自身不记录，避免「登录成功 → 回授权页」的循环。
    if (!isAuthPath(location)) {
      window.sessionStorage.setItem('ylt-redirect-after-bind', location);
      window.sessionStorage.setItem('ylt-wx-redirect', location);
    }
    // 微信内直接走静默授权（已绑定用户可无感换发 token）；
    // 非微信环境没有 OAuth 通道，回绑定页让用户用工号+密码/短信登录。
    return <Redirect to={isWeChatBrowser() ? '/wx-oauth' : '/bind-account'} />;
  }
  return <>{children}</>;
}
