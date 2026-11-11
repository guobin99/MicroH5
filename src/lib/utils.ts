import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import dayjs, { type Dayjs } from 'dayjs';

export function cn(...inputs: (string | undefined | null | false)[]): string {
  return twMerge(clsx(...inputs));
}

export function formatMoney(value: number): string {
  return value.toFixed(2);
}

export function maskCardNo(cardNo: string): string {
  if (cardNo.length < 8) return cardNo;
  return `${cardNo.slice(0, 4)} **** **** ${cardNo.slice(-4)}`;
}

export function maskIdCard(idCard: string): string {
  if (idCard.includes('*')) return idCard;
  return `${idCard.slice(0, 3)}***********${idCard.slice(-4)}`;
}

export function maskPhone(phone: string): string {
  if (phone.includes('*')) return phone;
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
}

export function today(): Dayjs {
  return dayjs();
}

export function withinRange(time: string, range: 'today' | '7d' | '30d' | '90d'): boolean {
  const target = dayjs(time);
  if (!target.isValid()) return false;
  const now = dayjs();
  const days = range === 'today' ? 0 : range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return target.isSame(now, 'day') || target.isAfter(now.subtract(days, 'day'));
}

export function accountStatusText(status: string): string {
  if (status === 'locked') return '已挂失';
  if (status === 'frozen') return '已冻结';
  return '正常';
}

export function makeId(prefix: string): string {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

/**
 * 判断餐别是否可预定（SF_Repast）。
 * 规则：开始时间与结束时间「均为 0 点」时不可预定，不在订餐选项中显示。
 * 0 点指 00:00（兼容 "0:00" / "00:00:00" 等写法）。
 */
export function isOrderableRepast(repast: { Bgn_Time?: string; End_Time?: string } | null | undefined): boolean {
  if (!repast) return false;
  const isMidnight = (t?: string): boolean => {
    const s = (t || '').trim();
    if (!s) return false;
    // 取 HH:mm 部分判断小时与分钟是否都为 0
    const m = s.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return false;
    return Number(m[1]) === 0 && Number(m[2]) === 0;
  };
  // 两个时间都为 0 点 → 不可预定
  return !(isMidnight(repast.Bgn_Time) && isMidnight(repast.End_Time));
}

/** 餐别及其 DC_Repast 订餐规则（由 /api/m/canteen/repasts 返回） */
export interface RepastRule {
  Repast_No?: string;
  Repast_Name?: string;
  Bgn_Time?: string;
  End_Time?: string;
  Price?: number;
  /** DC_Repast 是否有记录（false=未配置订餐规则，不做限制） */
  hasRule?: boolean;
  /** Can_Order：1 允许订餐，0 不允许 */
  canOrder?: boolean;
  /** Order_Days：需提前预定的天数 */
  orderDays?: number;
  /** DC_Repast.End_Time：订餐截止时间 */
  dcEndTime?: string;
  /** 后端算出的最晚可订用餐日期 yyyy-MM-DD */
  latestOrderDate?: string;
  latestDeadlineText?: string;
  deadlineTip?: string;
}

/**
 * 餐别是否开放订餐：DC_Repast.Can_Order=0 时不开放。
 * 未配置 DC_Repast 规则（hasRule=false）时保持原有行为，视为开放。
 */
export function repastCanOrder(repast: RepastRule | null | undefined): boolean {
  if (!repast) return false;
  if (repast.hasRule === false) return true;
  return repast.canOrder !== false;
}

/** 把 "12:00" / "12:00:00" 解析为「当天分钟数」；空或非法按 0（00:00）处理 */
function minutesOfDay(time?: string): number {
  const m = String(time || '').trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * 用餐日 date 的订餐截止时刻 = (date − Order_Days) 日的 End_Time。
 * 例：Order_Days=1、End_Time=12:00 → 需在前一天 12:00 前预定。
 */
export function repastDeadline(date: string, repast: RepastRule | null | undefined): Date | null {
  if (!repast || repast.hasRule === false) return null;
  const d = dayjs(date);
  if (!d.isValid()) return null;
  return d.startOf('day')
    .subtract(Number(repast.orderDays || 0), 'day')
    .add(minutesOfDay(repast.dcEndTime), 'minute')
    .toDate();
}

/** 某用餐日在该餐别下当前是否还能订（仅看订餐规则；份数由后端下单时最终校验） */
export function isDateOrderable(date: string, repast: RepastRule | null | undefined): boolean {
  if (!repastCanOrder(repast)) return false;
  const deadline = repastDeadline(date, repast as RepastRule);
  if (!deadline) return true;              // 未配置规则 → 不限制
  return !dayjs().isAfter(dayjs(deadline));
}

/** 该餐别的最晚可订用餐日 yyyy-MM-DD；无规则时返回 ''（表示不限） */
export function repastLatestOrderDate(repast: RepastRule | null | undefined): string {
  if (!repast || repast.hasRule === false) return '';
  return repast.latestOrderDate || '';
}

/** 该餐别的订餐截止说明文案 */
export function repastDeadlineTip(repast: RepastRule | null | undefined): string {
  if (!repast || repast.hasRule === false) return '';
  return repast.deadlineTip || '';
}

export { clsx };
export { twMerge as mergeTailwind };
