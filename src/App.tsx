import React, { Suspense, lazy } from 'react';
import { Route, Router, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { DotLoading } from 'antd-mobile';
import { Toaster } from 'sonner';
import { AppProvider } from './context/AppContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import BindAccount from './pages/BindAccount';

const AccountDetail = lazy(() => import('./pages/AccountDetail'));
const Recharge = lazy(() => import('./pages/Recharge'));
const PaymentCode = lazy(() => import('./pages/PaymentCode'));
const PassCode = lazy(() => import('./pages/PassCode'));
const ConsumptionRecords = lazy(() => import('./pages/ConsumptionRecords'));
const RechargeRecords = lazy(() => import('./pages/RechargeRecords'));
const AccessRecords = lazy(() => import('./pages/AccessRecords'));
const Menu = lazy(() => import('./pages/Menu'));
const Order = lazy(() => import('./pages/Order'));
const MyOrders = lazy(() => import('./pages/MyOrders'));
const VisitorAppointment = lazy(() => import('./pages/VisitorAppointment'));
const VisitorRegister = lazy(() => import('./pages/VisitorRegister'));
const VisitorApprovals = lazy(() => import('./pages/VisitorApprovals'));
const VisitorRecords = lazy(() => import('./pages/VisitorRecords'));
const Attendance = lazy(() => import('./pages/Attendance'));
const AttendanceApply = lazy(() => import('./pages/AttendanceApply'));
const FaceCollection = lazy(() => import('./pages/FaceCollection'));
const CardManage = lazy(() => import('./pages/CardManage'));
const PasswordManage = lazy(() => import('./pages/PasswordManage'));
const PhoneChange = lazy(() => import('./pages/PhoneChange'));
const MessageSettings = lazy(() => import('./pages/MessageSettings'));
const Feedback = lazy(() => import('./pages/Feedback'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const Agreement = lazy(() => import('./pages/Agreement'));
const NotFound = lazy(() => import('./pages/NotFound'));
const WxOauth = lazy(() => import('./pages/WxOauth'));

function protectedPage(page: React.ReactNode): React.JSX.Element {
  return <ProtectedRoute>{page}</ProtectedRoute>;
}

function PageLoading(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center gap-3">
      <DotLoading color="primary" />
      <span className="text-xs text-gray-400">页面加载中</span>
    </div>
  );
}

export default function App(): React.JSX.Element {
  return (
    <AppProvider>
      <Router hook={useHashLocation}>
        <Suspense fallback={<PageLoading />}>
          <Switch>
            <Route path="/bind-account" component={BindAccount} />
            <Route path="/wx-oauth" component={WxOauth} />
            <Route path="/">{protectedPage(<MainLayout />)}</Route>
            <Route path="/home">{protectedPage(<MainLayout />)}</Route>
            <Route path="/service">{protectedPage(<MainLayout />)}</Route>
            <Route path="/message">{protectedPage(<MainLayout />)}</Route>
            <Route path="/profile">{protectedPage(<MainLayout />)}</Route>

            <Route path="/account-detail">{protectedPage(<AccountDetail />)}</Route>
            <Route path="/recharge">{protectedPage(<Recharge />)}</Route>
            <Route path="/payment-code">{protectedPage(<PaymentCode />)}</Route>
            <Route path="/pass-code">{protectedPage(<PassCode />)}</Route>
            <Route path="/consumption-records">{protectedPage(<ConsumptionRecords />)}</Route>
            <Route path="/recharge-records">{protectedPage(<RechargeRecords />)}</Route>
            <Route path="/access-records">{protectedPage(<AccessRecords />)}</Route>
            <Route path="/menu">{protectedPage(<Menu />)}</Route>
            <Route path="/order">{protectedPage(<Order />)}</Route>
            <Route path="/my-orders">{protectedPage(<MyOrders />)}</Route>
            <Route path="/visitor-appointment">{protectedPage(<VisitorAppointment />)}</Route>
            <Route path="/visitor-register">{protectedPage(<VisitorRegister />)}</Route>
            <Route path="/visitor-approvals">{protectedPage(<VisitorApprovals />)}</Route>
            <Route path="/visitor-records">{protectedPage(<VisitorRecords />)}</Route>
            <Route path="/attendance">{protectedPage(<Attendance />)}</Route>
            <Route path="/attendance-apply">{protectedPage(<AttendanceApply />)}</Route>
            <Route path="/face-collection">{protectedPage(<FaceCollection />)}</Route>
            <Route path="/card-manage">{protectedPage(<CardManage />)}</Route>
            <Route path="/password-manage">{protectedPage(<PasswordManage />)}</Route>
            <Route path="/phone-change">{protectedPage(<PhoneChange />)}</Route>
            <Route path="/message-settings">{protectedPage(<MessageSettings />)}</Route>
            <Route path="/feedback">{protectedPage(<Feedback />)}</Route>
            <Route path="/help">{protectedPage(<HelpCenter />)}</Route>
            <Route path="/agreement" component={Agreement} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
        <Toaster richColors position="top-center" />
      </Router>
    </AppProvider>
  );
}
