# 一脸通（一卡通）微信端 H5

面向微信公众号服务号内嵌 H5 的一脸通移动端应用，覆盖账户绑定、人脸采集、充值、付款码、通行码、消费记录、订餐、访客、考勤、卡片管理和个人中心等场景。

## 技术栈

- React 18 + TypeScript + Vite
- Ant Design Mobile 5
- wouter Hash 路由
- Tailwind CSS V4（CDN）
- dayjs、qrcode.react、sonner

## 本地运行

```bash
npm install
npm run dev
```

## 生产构建

```bash
npm run build
npm run preview
```

## 说明

当前项目为纯前端演示版本，页面状态保存在浏览器本地；清除浏览器数据会丢失演示记录，也不会跨设备同步。正式上线前需要接入一脸通平台 API、微信支付 JSAPI、微信网页授权、模板消息和服务端会话管理。
