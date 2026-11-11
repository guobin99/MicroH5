import React, { useState } from 'react';
import { useLocation, useSearch } from 'wouter';
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

/** 订餐服务协议（订餐页《订餐服务协议》跳转 ?tab=order） */
const orderAgreement = [
  '订餐模式：平台按后台配置提供「订餐扣款」与「消费扣款」两种模式，以订餐页显示的模式为准。订餐扣款模式下提交订单即从一卡通余额扣款；消费扣款模式下提交订单不扣款，取餐时才扣款。',
  '订餐开放范围：仅开放订餐的餐别可预订，未开放订餐的餐别不在订餐选项中展示，也无法提交订单。',
  '提前预定与截止时间：每个餐别可设置需提前预定的天数与截止时间，需在该截止时间前完成预定；超过截止时间后，该用餐日期的预订入口将关闭。',
  '份数限制：菜品按每日可订份数限量，剩余份数为总份数扣除已预定份数，份数售罄后不可继续下单。',
  '同一用餐日期、同一餐别不可重复订餐，提交时系统会校验并拦截重复订单。',
  '退订：需在该餐别订餐截止时间前完成退订操作，逾期后不可退订。',
  '退款说明：订餐扣款模式下退订，金额原路退回一卡通余额；消费扣款模式下订餐时未扣款，退订仅取消订单，不产生退款。',
  '订单以「用餐日期 + 餐别」为一张独立订单，不同用餐日期或不同餐别分别生成订单，份数与截止时间按各自订单单独校验。',
];

type AgreementTab = 'privacy' | 'agreement' | 'order';

export default function Agreement(): React.JSX.Element {
  const [, setLocation] = useLocation();
  // 注意：wouter 的 useLocation() 只返回 pathname（不含查询串），查询串需用 useSearch() 读取
  const search = useSearch();
  // 支持深链指定初始 Tab：
  //   ?tab=agreement → 用户协议（充值页《充值服务协议》跳转，充值条款在“用户协议”内）
  //   ?tab=order    → 订餐服务协议（订餐页《订餐服务协议》跳转）
  const [tab, setTab] = useState<AgreementTab>(() => {
    const q = search || '';
    if (q.indexOf('tab=order') >= 0) return 'order';
    if (q.indexOf('tab=agreement') >= 0) return 'agreement';
    return 'privacy';
  });

  const list = tab === 'privacy' ? privacy : (tab === 'order' ? orderAgreement : userAgreement);
  const title = tab === 'privacy' ? '隐私政策摘要' : (tab === 'order' ? '订餐服务协议' : '用户协议摘要');

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar onBack={() => setLocation('/profile')} className="bg-white">协议与关于</NavBar>
      <Tabs activeKey={tab} onChange={(key) => setTab(key as AgreementTab)} className="bg-white">
        <Tabs.Tab title="隐私政策" key="privacy" />
        <Tabs.Tab title="用户协议" key="agreement" />
        <Tabs.Tab title="订餐服务" key="order" />
      </Tabs>
      <div className="p-4 space-y-4">
        <Card className="!rounded-2xl !border !border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
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
