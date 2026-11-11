import type { MealOrder } from '../data/mock';

/**
 * 后端订餐记录（/api/m/canteen/myorders）→ 前端 MealOrder 结构的映射。
 * H5 的 AppContext 与 MyOrders 页面共用，避免两处口径不一致。
 */
export function mapMealOrder(o: any): MealOrder {
  return {
    id: o.orderNo,
    orderNo: o.orderNo,
    date: o.orderDate || '',
    orderTime: (o.orderTime || '').replace('T', ' ').substring(0, 16),
    canteen: '',
    // 餐别名称取自 SF_Repast.Repast_Name（后端已关联，repastNo 为编号）
    meal: o.repastName || o.repastNo || '',
    repastNo: o.repastNo || '',
    amount: Number(o.amount || 0),
    isWareOrder: !!o.isWareOrder,
    copies: o.copies == null ? null : Number(o.copies),
    mode: o.mode || '',
    dishes: Array.isArray(o.dishes) ? o.dishes.map((d: any) => ({
      wareId: Number(d.wareId || 0),
      wareName: d.wareName || '',
      warePrice: Number(d.warePrice || 0),
      copies: Number(d.copies || 0),
      subtotal: Number(d.subtotal || 0),
    })) : [],
    status: o.status === '已取餐' ? 'picked' : 'ordered',
    pickupCode: (o.orderNo || '').slice(-4),
    pickupTime: '',
    deadline: '',
  };
}
