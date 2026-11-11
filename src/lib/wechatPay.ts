// 微信 JSAPI 支付（公众号 H5）调起封装。
// 注意：WeixinJSBridge 在部分机型/首次进入时并非立即可用，必须等 WeixinJSBridgeReady，
// 否则直接 invoke 会被跳过，表现为「点了支付没反应，最后提示支付结果未知」。

export function waitForWeixinJSBridge(timeoutMs = 6000): Promise<any> {
  if (typeof window !== 'undefined' && window.WeixinJSBridge) {
    return Promise.resolve(window.WeixinJSBridge);
  }
  return new Promise((resolve, reject) => {
    let finished = false;
    let timer = 0;
    const cleanup = (): void => {
      window.clearTimeout(timer);
      document.removeEventListener('WeixinJSBridgeReady', onReady as EventListener, false);
    };
    const onReady = (): void => {
      if (finished) return;
      finished = true;
      cleanup();
      resolve(window.WeixinJSBridge);
    };
    timer = window.setTimeout(() => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new Error('微信支付环境未就绪，请在微信中打开后重试'));
    }, timeoutMs);
    document.addEventListener('WeixinJSBridgeReady', onReady as EventListener, false);
  });
}

export type WechatPayResult = 'ok' | 'cancel' | 'fail';

/** 调起公众号 JSAPI 支付；返回 ok / cancel / fail，不因用户取消抛异常 */
export async function invokeWechatPay(params: Record<string, any>): Promise<WechatPayResult> {
  const bridge = await waitForWeixinJSBridge();
  return new Promise<WechatPayResult>((resolve, reject) => {
    let finished = false;
    let timer = 0;
    const finish = (result: WechatPayResult): void => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      resolve(result);
    };
    timer = window.setTimeout(() => {
      // 超时不下结论：交给上层查询微信侧真实状态，避免「已付款却提示失败」
      finish('fail');
    }, 60000);
    try {
      bridge.invoke('getBrandWCPayRequest', params, (res: any) => {
        const message = String((res && res.err_msg) || '');
        if (message === 'get_brand_wcpay_request:ok') finish('ok');
        else if (message === 'get_brand_wcpay_request:cancel') finish('cancel');
        else finish('fail');
      });
    } catch (error) {
      finished = true;
      window.clearTimeout(timer);
      reject(error);
    }
  });
}
