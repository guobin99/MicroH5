import React from 'react';
import { useLocation } from 'wouter';
import { Button, Card, List, NavBar, Tag } from 'antd-mobile';
import { AccountBookOutlined, HistoryOutlined, PayCircleOutlined, QrcodeOutlined, RightOutlined } from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import { accountStatusText, formatMoney, maskCardNo } from '../lib/utils';

export default function AccountDetail(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { user, account } = useApp();
  const available = account.status === 'normal' ? account.balance : 0;

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar onBack={() => setLocation('/')} className="bg-white">账户详情</NavBar>
      <div className="p-4 space-y-4">
        <Card className="!rounded-3xl !border-0 !bg-[#0064E6] !text-white !shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-blue-100 text-sm">可用余额</div>
              <div className="text-4xl font-bold font-mono mt-3">¥{formatMoney(available)}</div>
              <div className="text-xs text-blue-100 mt-3">{maskCardNo(account.cardNo)}</div>
            </div>
            <Tag color={account.status === 'normal' ? 'success' : 'danger'} fill="outline" className="!text-white !border-white/50">
              {accountStatusText(account.status)}
            </Tag>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-white/20 text-sm">
            <div>
              <div className="text-blue-100 text-xs">待圈存金额</div>
              <div className="font-mono mt-1">¥{formatMoney(account.pendingAmount)}</div>
            </div>
            <div>
              <div className="text-blue-100 text-xs">更新时间</div>
              <div className="mt-1 text-xs">{account.updatedAt}</div>
            </div>
          </div>
        </Card>

        {account.status !== 'normal' && (
          <Card className="!rounded-2xl !border !border-red-100 !bg-red-50">
            <div className="text-sm font-semibold text-red-600">账户暂不可用</div>
            <div className="text-xs text-red-500 mt-2 leading-5">
              当前账户{accountStatusText(account.status)}，付款码、实体卡消费及订餐扣款已被拦截；请先完成解挂或联系管理员。
            </div>
          </Card>
        )}

        <Card className="!rounded-2xl !border !border-gray-100" bodyClassName="!p-0">
          <List>
            <List.Item prefix={<div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0064E6] flex items-center justify-center"><AccountBookOutlined /></div>} extra={user.name}>
              持卡人
            </List.Item>
            <List.Item prefix={<div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center"><AccountBookOutlined /></div>} extra={user.employeeNo}>
              工号/学号
            </List.Item>
            <List.Item prefix={<div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center"><PayCircleOutlined /></div>} arrow={<RightOutlined className="text-gray-300" />} onClick={() => setLocation('/recharge')}>
              微信充值
            </List.Item>
            <List.Item prefix={<div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><QrcodeOutlined /></div>} arrow={<RightOutlined className="text-gray-300" />} onClick={() => setLocation('/payment-code')}>
              出示付款码
            </List.Item>
            <List.Item prefix={<div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><HistoryOutlined /></div>} arrow={<RightOutlined className="text-gray-300" />} onClick={() => setLocation('/recharge-records')}>
              充值记录
            </List.Item>
          </List>
        </Card>

        <Button block color="primary" size="large" className="!rounded-full !h-12" onClick={() => setLocation('/recharge')} disabled={account.status !== 'normal'}>
          立即充值
        </Button>
      </div>
    </div>
  );
}
