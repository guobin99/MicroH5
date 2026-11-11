import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Dialog, Input, List, NavBar, Tag, Toast } from 'antd-mobile';
import { CreditCardOutlined, ExclamationCircleOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import { accountStatusText, formatMoney, maskCardNo } from '../lib/utils';

export default function CardManage(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { user, account, setAccountStatus } = useApp();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [operationLogs, setOperationLogs] = useState<{ time: string; text: string }[]>([]);
  const locked = account.status === 'locked';

  const verifyAndRun = (action: 'lock' | 'unlock'): void => {
    if (!/^[A-Za-z0-9]{4,20}$/.test(password)) {
      Toast.show({ content: '请输入4-20位密码（字母或数字）', position: 'center' });
      return;
    }
    Dialog.confirm({
      title: action === 'lock' ? '确认挂失' : '确认解挂',
      content: action === 'lock'
        ? '挂失后实体卡、付款码及相关消费扣款立即停用，是否继续？'
        : '解挂后实体卡与付款码将恢复正常使用，是否继续？',
      confirmText: action === 'lock' ? '确认挂失' : '确认解挂',
      cancelText: '取消',
      onConfirm: () => {
        setLoading(true);
        window.setTimeout(() => {
          setAccountStatus(action === 'lock' ? 'locked' : 'normal');
          setPassword('');
          setLoading(false);
          Toast.show({ content: action === 'lock' ? '挂失成功，付款码已同步停用' : '解挂成功，卡片已恢复', position: 'center' });
          const d = new Date();
          const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
          const time = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
          setOperationLogs((prev) => [{ time, text: action === 'lock' ? '卡片挂失' : '卡片解挂' }, ...prev]);
        }, 800);
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar onBack={() => setLocation('/profile')} className="bg-white">卡片管理</NavBar>
      <div className="p-4 space-y-4">
        <Card className="!rounded-3xl !border-0 !bg-[#111827] !text-white !shadow-lg">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl"><CreditCardOutlined /></div>
              <div>
                <div className="font-semibold">一脸通 · 员工卡</div>
                <div className="text-xs text-gray-400 mt-1">消费与门禁实体卡</div>
              </div>
            </div>
            <Tag color={locked ? 'danger' : 'success'} fill="outline" className="!text-white !border-white/40">{accountStatusText(account.status)}</Tag>
          </div>
          <div className="text-xl font-mono tracking-widest">{maskCardNo(account.cardNo)}</div>
          <div className="flex justify-between text-sm mt-8">
            <div><div className="text-xs text-gray-400">持卡人</div><div className="mt-1">{user.name}</div></div>
            <div className="text-right"><div className="text-xs text-gray-400">有效期</div><div className="mt-1">2028-09</div></div>
          </div>
        </Card>

        <Card className="!rounded-2xl !border !border-gray-100" bodyClassName="!p-0">
          <List>
            <List.Item extra={maskCardNo(account.cardNo)}>卡号</List.Item>
            <List.Item extra="2024-09-01">开卡日期</List.Item>
            <List.Item extra={<span className="font-mono text-orange-600">¥{formatMoney(account.balance)}</span>}>账户余额</List.Item>
            <List.Item extra={<span className={locked ? 'text-red-500' : 'text-green-600'}>{accountStatusText(account.status)}</span>}>卡片状态</List.Item>
          </List>
        </Card>

        <Card className="!rounded-2xl !border !border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">身份验证</h2>
          <Input
            placeholder="请输入一卡通消费/查询密码（4-20位，字母或数字）"
            type="password"
            value={password}
            onChange={setPassword}
            className="!h-12 !bg-gray-50 !rounded-xl !px-4"
          />
          {locked ? (
            <Button block color="primary" size="large" loading={loading} className="!rounded-full !h-12 mt-4" onClick={() => verifyAndRun('unlock')}>
              <UnlockOutlined className="mr-2" />解除挂失
            </Button>
          ) : (
            <Button block color="danger" size="large" loading={loading} className="!rounded-full !h-12 mt-4" onClick={() => verifyAndRun('lock')}>
              <LockOutlined className="mr-2" />一键挂失
            </Button>
          )}
          <div className="mt-4 rounded-xl bg-orange-50 p-3 flex gap-2 text-xs text-orange-700 leading-5">
            <ExclamationCircleOutlined className="mt-0.5 flex-shrink-0" />
            <div>卡片丢失请立即挂失；补换新卡后由平台自动关联原账户并同步状态。关键操作将留存审计日志。</div>
          </div>
        </Card>

        <Card className="!rounded-2xl !border !border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">操作记录</h2>
          {operationLogs.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-4">暂无操作记录</div>
          ) : (
            <div className="space-y-3">
              {operationLogs.map((log) => (
                <div key={log.time} className="flex justify-between gap-3 text-sm">
                  <span className="text-gray-600">{log.text}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{log.time}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
