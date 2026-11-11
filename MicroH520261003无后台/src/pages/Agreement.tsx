import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, NavBar, Tabs, Tag } from 'antd-mobile';

const userAgreement = [
  '用户应使用本人微信和本人一脸通账户，不得转借、出售或共享付款码、通行码及取餐凭证。',
  '账户绑定、充值、挂失、密码修改、人脸采集等关键操作需完成身份验证，并留存必要操作日志。',
  '付款码、通行码为动态短时效凭证，截图、转发或超过有效期后不可用。',
  '充值资金仅用于一脸通账户内消费，是否支持提现以平台政策为准，默认不支持提现。',
];

const privacy = [
  '平台仅收集完成服务所必需的姓名、工号、手机号、卡号、消费、门禁、订餐、访客和考勤信息。',
  '证件号、手机号、卡号等敏感字段脱敏展示并加密存储；人脸信息属于敏感个人信息，采集前需单独同意。',
  '人脸照片按最小必要原则加密存储，限定保存期限，删除或注销账户时同步清除。',
  '关键接口使用签名校验、防重放、频率限制和全链路HTTPS保护。',
];

export default function Agreement(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState('privacy');

  const list = tab === 'privacy' ? privacy : userAgreement;

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar onBack={() => setLocation('/profile')} className="bg-white">协议与关于</NavBar>
      <Tabs activeKey={tab} onChange={setTab} className="bg-white">
        <Tabs.Tab title="隐私政策" key="privacy" />
        <Tabs.Tab title="用户协议" key="agreement" />
      </Tabs>
      <div className="p-4 space-y-4">
        <Card className="!rounded-2xl !border !border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-gray-900">{tab === 'privacy' ? '隐私政策摘要' : '用户协议摘要'}</h1>
            <Tag color="primary">V1.1</Tag>
          </div>
          <div className="space-y-4">
            {list.map((item, index) => (
              <div key={item} className="flex gap-3 text-sm text-gray-600 leading-6">
                <span className="w-6 h-6 rounded-full bg-blue-50 text-[#0064E6] flex items-center justify-center text-xs flex-shrink-0">{index + 1}</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="!rounded-2xl !border !border-gray-100">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">应用名称</span><span>一脸通微信端 H5</span></div>
            <div className="flex justify-between"><span className="text-gray-500">当前版本</span><span>V1.1.0</span></div>
            <div className="flex justify-between"><span className="text-gray-500">运行环境</span><span>微信公众号内嵌 H5</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
}
