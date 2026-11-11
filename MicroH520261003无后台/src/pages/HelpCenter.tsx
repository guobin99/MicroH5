import React from 'react';
import { useLocation } from 'wouter';
import { Card, Collapse, NavBar } from 'antd-mobile';
import { CustomerServiceOutlined, FileTextOutlined, QuestionCircleOutlined } from '@ant-design/icons';

const faqs = [
  {
    key: 'pay-code',
    title: '付款码截图后为什么不能使用？',
    content: '付款码由服务端动态签发，默认60秒自动刷新且一次性有效。截图、转发或超过有效期后都会被消费机拒绝，请重新进入页面获取新码。',
  },
  {
    key: 'recharge',
    title: '微信支付成功但余额没有立即增加怎么办？',
    content: '订单会进入“支付成功待入账”状态，系统自动重试入账；超过约定时限仍未到账将原路退款，并通过消息中心告知处理进度。',
  },
  {
    key: 'face',
    title: '人脸照片为什么会被驳回？',
    content: '常见原因包括非正面照片、五官遮挡、照片模糊、亮度不足或与平台已有人脸比对不一致。请根据驳回原因重新采集。',
  },
  {
    key: 'order',
    title: '订餐可以在什么时间退订？',
    content: '在订单展示退订截止时间前可自助退订，退款原路退回一卡通余额；逾期后不可退订。',
  },
  {
    key: 'visitor',
    title: '访客凭证有效期是多久？',
    content: '访客凭证仅在预约时段和授权门点范围内有效，超时或签离后自动失效。',
  },
];

export default function HelpCenter(): React.JSX.Element {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar onBack={() => setLocation('/profile')} className="bg-white">帮助中心</NavBar>
      <div className="p-4 space-y-4">
        <Card className="!rounded-2xl !border !border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0064E6] flex items-center justify-center text-2xl"><QuestionCircleOutlined /></div>
            <div>
              <div className="font-semibold text-gray-900">常见问题</div>
              <div className="text-xs text-gray-500 mt-1">覆盖充值、二维码、订餐、访客与人脸采集</div>
            </div>
          </div>
        </Card>

        <Card className="!rounded-2xl !border !border-gray-100" bodyClassName="!p-0">
          <Collapse accordion>
            {faqs.map((item) => (
              <Collapse.Panel key={item.key} title={item.title}>
                <div className="text-sm text-gray-600 leading-6">{item.content}</div>
              </Collapse.Panel>
            ))}
          </Collapse>
        </Card>

        <Card className="!rounded-2xl !border !border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><CustomerServiceOutlined /> 联系客服</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">客服电话</span><a className="text-[#0064E6]" href="tel:4008888888">400-888-8888</a></div>
            <div className="flex justify-between"><span className="text-gray-500">服务窗口</span><span>行政楼一楼服务大厅</span></div>
            <div className="flex justify-between"><span className="text-gray-500">服务时间</span><span>工作日 9:00-18:00</span></div>
          </div>
        </Card>

        <Card className="!rounded-2xl !border !border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><FileTextOutlined /> 协议与隐私</h2>
          <div className="grid grid-cols-2 gap-3">
            <button className="h-11 rounded-xl bg-gray-50 text-sm text-gray-700" onClick={() => setLocation('/agreement')}>用户协议</button>
            <button className="h-11 rounded-xl bg-gray-50 text-sm text-gray-700" onClick={() => setLocation('/agreement')}>隐私政策</button>
          </div>
        </Card>
      </div>
    </div>
  );
}
