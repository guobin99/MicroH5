import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, NavBar, Tag, Toast } from 'antd-mobile';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  GatewayOutlined,
  HistoryOutlined,
  ReloadOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../context/AppContext';
import { accountStatusText } from '../lib/utils';
import { m } from '../lib/api';

/** 门禁权限（GET /m/access/rights） */
export interface DoorRight {
  ctrlNo: string;
  doorNo: number;
  doorName: string;
  ctrlName: string;
  psnTimeNo: number;
  psnTimeName: string;
  /** 未配置时段限制 → 全天可通行 */
  allDay: boolean;
  /** 有效时间窗，如 ["08:30-12:00","13:30-17:30"] */
  timeRanges: string[];
  /** 当前时刻是否落在授权时段内（仅按当天时刻判断） */
  inTimeNow: boolean;
}

interface LatestPass {
  door: string;
  passType: string;
  direction: string;
  time: string;
}

const fmtTime = (v: string): string => (v || '').replace('T', ' ').substring(0, 16);

export default function PassCode(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { user, account } = useApp();
  const available = account.status === 'normal';

  const [qrValue, setQrValue] = useState('');
  const [qrError, setQrError] = useState('');
  const [countdown, setCountdown] = useState(0);

  // 当前权限：取后台 MJ_PsnDoorRight，不再前端写死
  const [rights, setRights] = useState<DoorRight[]>([]);
  const [rightsLoading, setRightsLoading] = useState(true);
  const [rightsError, setRightsError] = useState('');
  // 最近一次通行：取后台 MJ_NormalRecord 最新一条
  const [latest, setLatest] = useState<LatestPass | null>(null);
  const [latestLoading, setLatestLoading] = useState(true);

  // 附加3：通行码从后端获取（服务端校验卡状态，挂失不再签发）
  const generateCode = useCallback(async (): Promise<void> => {
    try {
      const r = await m.passCode();
      if (!r || r.success === false || !r.code) {
        setQrValue('');
        setCountdown(0);
        setQrError((r && r.msg) || '通行码暂不可用');
        return;
      }
      setQrError('');
      setQrValue(r.code);
      setCountdown(Number(r.expireSeconds) || 60);
    } catch {
      setQrValue('');
      setCountdown(0);
      setQrError('获取通行码失败，请稍后重试');
    }
  }, []);

  const loadRights = useCallback(async (): Promise<void> => {
    setRightsLoading(true);
    try {
      const rows = await m.accessRights();
      setRights(Array.isArray(rows) ? rows : []);
      setRightsError('');
    } catch {
      setRights([]);
      setRightsError('权限加载失败');
    } finally {
      setRightsLoading(false);
    }
  }, []);

  const loadLatest = useCallback(async (): Promise<void> => {
    setLatestLoading(true);
    try {
      const r = await m.accessLatest();
      setLatest(r && r.hasData ? { door: r.door || '', passType: r.passType || '', direction: r.direction || '', time: r.time || '' } : null);
    } catch {
      setLatest(null);
    } finally {
      setLatestLoading(false);
    }
  }, []);

  useEffect(() => {
    // 权限与最近通行与账户状态无关，账户挂失时也要能看到
    loadRights();
    loadLatest();
  }, [loadRights, loadLatest]);

  useEffect(() => {
    if (!available) return;
    generateCode();
  }, [available, generateCode]);

  // 倒计时只做减法，归零后重新取码（避免在 setState 里发请求导致重复调用）
  useEffect(() => {
    if (!qrValue) return;
    const timer = window.setInterval(() => setCountdown((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => window.clearInterval(timer);
  }, [qrValue]);

  useEffect(() => {
    if (!qrValue || countdown > 0) return;
    generateCode();
  }, [countdown, qrValue, generateCode]);

  const handleRefresh = (): void => {
    generateCode();
    Toast.show({ content: '通行码已刷新', position: 'center' });
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar
        onBack={() => setLocation('/')}
        className="bg-white"
        right={<Button size="small" fill="outline" onClick={() => setLocation('/access-records')}><HistoryOutlined /> 记录</Button>}
      >
        通行码
      </NavBar>

      <div className="p-4 space-y-4">
        <Card className="!rounded-2xl !border !border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 text-2xl">
              <GatewayOutlined />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-semibold text-gray-900">{user.name}</div>
              <div className="text-sm text-gray-500 mt-1">{user.department} · 工号 {user.employeeNo}</div>
            </div>
            <Tag color={available ? 'success' : 'danger'}>{accountStatusText(account.status)}</Tag>
          </div>
        </Card>

        <Card className="!rounded-3xl !border !border-gray-100 !shadow-md">
          {!available ? (
            <div className="py-12 text-center">
              <CloseCircleOutlined className="text-5xl text-red-500" />
              <h2 className="text-lg font-semibold text-gray-900 mt-4">通行码暂不可用</h2>
              <p className="text-sm text-gray-500 mt-2">账户{accountStatusText(account.status)}，请联系管理员或先解除挂失。</p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4">
              <div className="p-5 bg-white rounded-2xl border-2 border-purple-100 shadow-inner min-h-[260px] min-w-[260px] flex items-center justify-center">
                {qrValue ? (
                  <QRCodeSVG value={qrValue} size={220} level="H" />
                ) : (
                  <div className="text-center px-4">
                    <ClockCircleOutlined className="text-4xl text-gray-300" />
                    <div className="text-sm text-gray-500 mt-3">{qrError || '通行码生成中…'}</div>
                  </div>
                )}
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mt-5">个人通行二维码</h2>
              <p className="text-sm text-gray-500 mt-2">请在门禁设备前出示，权限以平台授权为准</p>
              <div className="flex items-center gap-2 mt-5 text-sm text-gray-500">
                {qrValue ? <span>{countdown}秒后自动刷新</span> : <span>未能获取通行码</span>}
                <button aria-label="刷新通行码" onClick={handleRefresh}>
                  <ReloadOutlined className="text-purple-600" />
                </button>
              </div>
            </div>
          )}

          <div className="bg-purple-50 rounded-2xl p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-purple-900">当前权限</div>
              <button className="text-xs text-purple-600" onClick={() => { loadRights(); loadLatest(); }}>刷新</button>
            </div>

            {rightsLoading ? (
              <div className="text-xs text-purple-700">加载中…</div>
            ) : rights.length === 0 ? (
              <div className="text-xs text-purple-700 leading-5">
                {rightsError ? '权限加载失败，请点击右上角刷新' : '后台未配置门禁权限，如需开通请联系管理员'}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {rights.map((item) => (
                  <div key={`${item.ctrlNo}-${item.doorNo}`} className="flex items-start gap-2 text-xs text-purple-700">
                    {item.inTimeNow
                      ? <CheckCircleOutlined className="text-green-500 mt-[2px]" />
                      : <ClockCircleOutlined className="text-orange-500 mt-[2px]" />}
                    <div className="min-w-0">
                      <div className="truncate">{item.doorName}</div>
                      <div className="text-[10px] text-purple-500 mt-[2px] leading-4">
                        {item.allDay
                          ? '全天可通行'
                          : `${item.psnTimeName || item.timeRanges.join('、') || '限时段'}${item.inTimeNow ? ' · 当前可通行' : ' · 当前不在时段'}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-[10px] text-purple-500 mt-3 leading-4">
              权限与时段取自平台授权（人员门禁权限 + 进出时段），实际开闸以门禁设备校验为准。
            </div>
          </div>

          <div className="bg-orange-50 rounded-2xl p-3 mt-4 text-xs text-orange-700 leading-5">
            <div className="font-semibold mb-1">使用提示</div>
            <div>• 通行码一次性有效、60秒自动刷新，请勿截图或转发。</div>
            <div>• 人员离职、账户冻结或权限被收回时，通行码自动失效。</div>
          </div>
        </Card>

        <button className="w-full text-left" onClick={() => setLocation('/access-records')}>
          <Card className="!rounded-2xl !border !border-gray-100">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm text-gray-500">最近一次通行</div>
                {latestLoading ? (
                  <div className="text-sm text-gray-400 mt-1">加载中…</div>
                ) : latest ? (
                  <>
                    <div className="font-semibold text-gray-900 mt-1 truncate">
                      {latest.door} · {latest.direction}{latest.passType ? ` · ${latest.passType}` : ''}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{fmtTime(latest.time)}</div>
                  </>
                ) : (
                  <div className="text-sm text-gray-400 mt-1">暂无通行记录</div>
                )}
              </div>
              <RightOutlined className="text-gray-300" />
            </div>
          </Card>
        </button>
      </div>
    </div>
  );
}
