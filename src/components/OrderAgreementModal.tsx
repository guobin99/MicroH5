import React from 'react';
import { Modal } from 'antd-mobile';

/**
 * 订餐服务协议
 * 订餐页勾选前弹窗查看，不再跳转「协议与关于」页面。
 * 条款需与后台 DC_Repast 订餐规则、DC.Solution 扣款模式、份数限制保持一致；
 * 规则变更时同步改版本号。
 */
export const ORDER_AGREEMENT_VERSION = 'V1.1';
export const ORDER_AGREEMENT_UPDATED = '2026-11-13';

export const orderAgreementClauses: string[] = [
  '订餐模式：平台按后台配置提供「订餐扣款」与「消费扣款」两种模式，以订餐页显示的模式为准。订餐扣款模式下提交订单即从一卡通余额扣款；消费扣款模式下提交订单不扣款，取餐时才扣款。',
  '订餐开放范围：仅开放订餐的餐别可预订，未开放订餐的餐别不在订餐选项中展示，也无法提交订单。',
  '提前预定与截止时间：每个餐别可设置需提前预定的天数与截止时间，需在该截止时间前完成预定；超过截止时间后，该用餐日期的预订入口将关闭。',
  '份数限制：菜品按每日可订份数限量，剩余份数为总份数扣除已预定份数，份数售罄后不可继续下单。',
  '同一用餐日期、同一餐别不可重复订餐，提交时系统会校验并拦截重复订单。',
  '退订：需在该餐别订餐截止时间前完成退订操作，逾期后不可退订。',
  '退款说明：订餐扣款模式下退订，金额原路退回一卡通余额；消费扣款模式下订餐时未扣款，退订仅取消订单，不产生退款。',
  '订单以「用餐日期 + 餐别」为一张独立订单，不同用餐日期或不同餐别分别生成订单，份数与截止时间按各自订单单独校验。',
];

interface Props {
  visible: boolean;
  onClose: () => void;
  /** 点击「我已阅读并同意」时回调，一般用于把勾选框置为已同意 */
  onAgree?: () => void;
}

export default function OrderAgreementModal({ visible, onClose, onAgree }: Props): React.JSX.Element {
  return (
    <Modal
      visible={visible}
      title="订餐服务协议"
      content={
        <div>
          <div className="text-xs text-gray-400 mb-3">
            版本 {ORDER_AGREEMENT_VERSION} · 生效日期 {ORDER_AGREEMENT_UPDATED}
          </div>
          <div className="max-h-[55vh] overflow-y-auto pr-1 space-y-3">
            {orderAgreementClauses.map((text, index) => (
              <div key={text} className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-50 text-[#0064E6] flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <p className="text-xs text-gray-600 leading-5">{text}</p>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-400 mt-3 leading-5">
            如不同意本协议，请勿提交订餐；已提交的订单可在订餐截止时间前退订。
          </div>
        </div>
      }
      closeOnAction
      actions={[
        { key: 'close', text: '关闭' },
        { key: 'agree', text: '我已阅读并同意', primary: true, onClick: () => onAgree?.() },
      ]}
      onClose={onClose}
    />
  );
}
