// 客服信息（客服电话 / 服务窗口 / 服务时间）
// 唯一数据来源：后台 ST_SysParam（接口 /m/service/info），前端不得硬编码。
// 后台未配置时返回空串，界面统一展示「未配置」，不回落演示数据。
import { useEffect, useState } from 'react';
import { m as api } from './api';

export interface ServiceInfo {
  /** 客服电话（展示格式，可带区号与短横线） */
  servicePhone: string;
  /** 客服电话（可拨号格式，仅数字与开头的 +） */
  servicePhoneTel: string;
  /** 服务窗口 */
  serviceWindow: string;
  /** 服务时间 */
  serviceTime: string;
}

const EMPTY: ServiceInfo = { servicePhone: '', servicePhoneTel: '', serviceWindow: '', serviceTime: '' };

// 模块级缓存：帮助中心与意见反馈共用一次请求，避免页面来回切换重复拉取
let cache: ServiceInfo | null = null;
let pending: Promise<ServiceInfo> | null = null;

function normalize(res: any): ServiceInfo {
  return {
    servicePhone: String(res?.servicePhone || ''),
    servicePhoneTel: String(res?.servicePhoneTel || ''),
    serviceWindow: String(res?.serviceWindow || ''),
    serviceTime: String(res?.serviceTime || ''),
  };
}

export function loadServiceInfo(force = false): Promise<ServiceInfo> {
  if (!force && cache) return Promise.resolve(cache);
  if (pending) return pending;
  const p = api.serviceInfo().then(
    (res: any) => {
      const data = normalize(res);
      cache = data;
      return data;
    },
    // 请求失败保持空态（界面显示「未配置」），下次进入页面会重试
    () => EMPTY,
  );
  pending = p;
  p.then(() => { if (pending === p) pending = null; });
  return p;
}

/** 页面内使用：info 为后台返回值，loading 表示首次加载中 */
export function useServiceInfo(): { info: ServiceInfo; loading: boolean } {
  const [info, setInfo] = useState<ServiceInfo>(cache || EMPTY);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return;
    let alive = true;
    setLoading(true);
    loadServiceInfo().then((data) => {
      if (!alive) return;
      setInfo(data);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  return { info, loading };
}
