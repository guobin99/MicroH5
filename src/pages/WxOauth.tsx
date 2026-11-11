import React, { useEffect, useRef, useState } from 'react';
import { DotLoading } from 'antd-mobile';
import { m, resetAuthRedirect, setToken } from '../lib/api';
import { isWeChatBrowser, normalizeRedirect } from '../lib/auth';

// 公众号 AppId：优先取 Vite 环境变量（.env 中配置 VITE_WX_APP_ID），否则用占位符
const WX_APPID = ((import.meta as any).env?.VITE_WX_APP_ID as string) || '';
const REDIRECT_PATH = '/wx-oauth';

// 微信 OAuth2 授权中转页（snsapi_base 静默授权，仅服务号 H5 在微信内使用）
// 流程：带 code 进入 → 存 sessionStorage('ylt-wx-code') → 已绑定直接登录跳首页，未绑定去绑定页
export default function WxOauth(): React.JSX.Element {
  const [tip, setTip] = useState('微信授权中…');
  // StrictMode 下 effect 会执行两次；微信 code 只能兑换一次，必须防重入
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // 关键：本应用使用 hash 路由，微信 OAuth 回跳的 code/state 会拼在 # 片段里
    // （形如 https://域名/#/wx-oauth?code=XXX&state=/home），而不是真实 URL 的查询串。
    // 因此先取 hash 里的查询参数；部分微信版本会把参数拼到真实查询串，故兜底 location.search。
    const hash = window.location.hash || '';
    const searchInHash = hash.includes('?') ? hash.slice(hash.indexOf('?')) : '';
    const params = new URLSearchParams(searchInHash || window.location.search);
    const code = params.get('code') || '';
    const state = params.get('state') || '';
    // 回跳目标必须过滤掉授权页/绑定页，否则会出现「登录成功 → 回到授权页」的死循环
    const target = normalizeRedirect(window.sessionStorage.getItem('ylt-wx-redirect') || state);

    // 微信把 code 拼在真实查询串时，清掉它，避免刷新页面时复用已失效的 code
    if (window.location.search && /[?&]code=/.test(window.location.search)) {
      window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    }

    if (!code) {
      // 无 code：拼接授权链接并跳转（仅微信内有效；非微信环境回绑定页）
      if (!isWeChatBrowser() || !WX_APPID) {
        window.sessionStorage.removeItem('ylt-renewing');
        setTip('请在微信中打开，或直接使用工号+卡密码登录');
        window.setTimeout(() => { window.location.hash = '#/bind-account'; }, 1200);
        return;
      }
      window.sessionStorage.setItem('ylt-wx-redirect', target);
      const redirectUri = encodeURIComponent(`${window.location.origin}${window.location.pathname}#${REDIRECT_PATH}`);
      const oauthUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${WX_APPID}`
        + `&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base&state=${encodeURIComponent(target)}#wechat_redirect`;
      window.location.replace(oauthUrl);
      return;
    }

    // 拿到 code：存进 sessionStorage 并尝试静默登录（已绑定 OpenID 则直接发 Token）
    window.sessionStorage.setItem('ylt-wx-code', code);
    m.wxLogin(code).then((res: any) => {
      if (res && res.success && res.access_token) {
        setToken(res.access_token || '', Number(res.expires_in) || 0);
        resetAuthRedirect();
        // 续期/授权标记与临时回跳目标到此结束，避免影响下一次正常进入
        window.sessionStorage.removeItem('ylt-renewing');
        window.sessionStorage.removeItem('ylt-wx-redirect');
        window.sessionStorage.removeItem('ylt-redirect-after-bind');
        window.sessionStorage.removeItem('ylt-oauth-tried');
        window.sessionStorage.removeItem('ylt-wx-code');
        // 广播登录态恢复：AppContext 据此把 isBound 置回 true 并重新拉取业务数据
        try { window.dispatchEvent(new CustomEvent('ylt:authorized')); } catch { /* ignore */ }
        // target 已做规范化，绝不可能是 /wx-oauth 或 /bind-account。
        // 用 replace 而不是给 hash 赋值：不要把已兑换过 code 的授权页留在返回栈里。
        window.location.replace(`#${target}`);
        // 兜底：个别微信 WebView 对 replace 同文档 fragment 不触发路由更新时，
        // 确保不会继续停在「微信授权中…」。
        window.setTimeout(() => {
          if ((window.location.hash || '').indexOf('/wx-oauth') >= 0) {
            window.location.hash = `#${target}`;
          }
        }, 300);
        return;
      }
      if (res && res.needBind) {
        // 保存后端返回的 openid，供绑定使用
        window.sessionStorage.setItem('ylt-wx-openid', res.openid || '');
        window.sessionStorage.setItem('ylt-wx-unionid', res.unionid || '');
        // 清除已用过的 code，防止重复兑换
        window.sessionStorage.removeItem('ylt-wx-code');
        // 记住原目标，绑定成功后回到原页面
        window.sessionStorage.setItem('ylt-redirect-after-bind', target);
        window.sessionStorage.setItem('ylt-wx-redirect', target);
        window.sessionStorage.removeItem('ylt-renewing');
        window.sessionStorage.removeItem('ylt-oauth-tried');
        window.location.hash = '#/bind-account';
        return;
      }
      // 授权失败：给出提示后回绑定页，避免永远停在「微信授权中…」
      window.sessionStorage.removeItem('ylt-renewing');
      setTip('微信授权失败，请返回后重试');
      window.setTimeout(() => { window.location.hash = '#/bind-account'; }, 800);
    }).catch(() => {
      window.sessionStorage.removeItem('ylt-renewing');
      setTip('微信授权失败，请返回后重试');
      window.setTimeout(() => { window.location.hash = '#/bind-account'; }, 800);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center gap-3">
      <DotLoading color="primary" />
      <span className="text-xs text-gray-400">{tip}</span>
    </div>
  );
}
