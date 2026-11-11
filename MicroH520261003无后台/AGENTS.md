# 一脸通（一卡通）微信端H5应用 - 技术规范

## 技术栈

- **前端框架**: React 18.3.1 + TypeScript
- **构建工具**: Vite 8.3.1
- **UI组件库**: Ant Design Mobile 5.39.0
- **图标库**: @ant-design/icons 5.6.1
- **路由**: wouter 3.9.0（Hash路由模式）
- **样式**: Tailwind CSS V4（CDN）
- **工具库**: dayjs 1.11.20, qrcode.react 4.2.0
- **类名处理**: clsx 2.1.1, tailwind-merge 3.5.0
- **消息提示**: sonner 2.0.7

## 目录结构

```text
src/
├── components/
│   ├── ProtectedRoute.tsx      # 登录/绑定状态路由守卫
│   └── TimeRangeFilter.tsx     # 通用时间范围筛选
├── context/
│   └── AppContext.tsx          # 用户、账户、消息、订餐、访客、考勤全局状态
├── data/
│   └── mock.ts                 # 演示数据与类型定义
├── layouts/
│   └── MainLayout.tsx          # 主布局组件（含底部Tab导航）
├── pages/
│   ├── Home.tsx                # 首页
│   ├── Service.tsx             # 服务页
│   ├── Message.tsx             # 消息页
│   ├── MessageSettings.tsx     # 消息设置
│   ├── Profile.tsx             # 个人中心
│   ├── BindAccount.tsx         # 微信授权后账户绑定
│   ├── AccountDetail.tsx       # 账户详情
│   ├── Recharge.tsx            # 微信充值
│   ├── RechargeRecords.tsx     # 充值记录
│   ├── PaymentCode.tsx         # 付款码/通行码
│   ├── PassCode.tsx            # 通行二维码
│   ├── ConsumptionRecords.tsx  # 消费记录与异常申诉
│   ├── AccessRecords.tsx       # 门禁通行记录
│   ├── Menu.tsx                # 每日菜谱
│   ├── Order.tsx               # 菜谱/餐别订餐
│   ├── MyOrders.tsx            # 我的订餐、退订、取餐凭证
│   ├── VisitorAppointment.tsx  # 访客预约（被访人发起）
│   ├── VisitorRegister.tsx     # 访客登记（访客自助）
│   ├── VisitorApprovals.tsx    # 访客审批
│   ├── VisitorRecords.tsx      # 访客记录、凭证、签离
│   ├── Attendance.tsx          # 考勤日/月视图与统计
│   ├── AttendanceApply.tsx     # 补签/请假/异常申诉与我的申请
│   ├── FaceCollection.tsx      # 人脸授权、采集、质检、状态
│   ├── CardManage.tsx          # 卡片挂失与解挂
│   ├── PasswordManage.tsx      # 密码修改与重置
│   ├── PhoneChange.tsx         # 更换绑定手机号
│   ├── Feedback.tsx            # 意见反馈与工单
│   ├── HelpCenter.tsx          # 帮助中心/FAQ
│   ├── Agreement.tsx           # 隐私政策、用户协议、关于
│   └── NotFound.tsx            # 404页面
├── lib/
│   └── utils.ts                # 格式化、脱敏与工具函数
├── App.tsx                     # 路由入口（页面按需加载）
└── index.jsx                   # React渲染入口
```

## 数据存储

- 当前为纯前端演示项目，使用 React Context + useState 管理页面状态。
- 账户、用户、消息设置、订餐、访客和考勤申请等演示数据通过浏览器 `localStorage`/`sessionStorage` 保存。
- 浏览器本地数据仅用于当前设备演示，不会跨设备同步；正式环境必须替换为一脸通平台 API 与服务端数据库。
- 已预留微信支付、一脸通平台、公众号模板消息、JSSDK 等后端/平台接口接入位置。

## 用户认证

- Hash路由适配微信公众号环境。
- 账户绑定页模拟微信静默授权后获取 openid 的流程。
- 支持“姓名 + 工号/学号/卡号 + 手机验证码”或“姓名 + 工号/学号/卡号 + 查询密码”绑定。
- 绑定后本地模拟7天登录态；解绑后路由守卫会阻止继续访问业务页面。
- 一个微信openid仅允许绑定一个有效人员账户；换绑需先解绑。

## 依赖服务（预留）

- 微信支付 JSAPI：统一下单、回调验签、查询与退款
- 一脸通平台API：人员、账户、二维码、人脸、门禁、订餐、访客、考勤
- 微信公众平台：网页授权、JSSDK签名、模板消息/订阅消息

## 架构说明

- 单页应用（SPA）+ Hash路由
- 页面级组件按需加载，降低首屏资源体积
- 通用筛选、路由守卫和全局账户状态抽离复用
- 金额单位：人民币元；时间格式：YYYY-MM-DD HH:mm
- 付款码/通行码默认60秒自动刷新
- 适配iOS/Android微信内置浏览器、刘海屏与安全区域

## 使用的 Skills

- 无需额外Skill，纯前端实现

## 运行

```bash
npm install
npm run dev
npm run build
npm run preview
```
