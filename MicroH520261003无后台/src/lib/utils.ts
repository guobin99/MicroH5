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

export { clsx };
export { twMerge as mergeTailwind };
