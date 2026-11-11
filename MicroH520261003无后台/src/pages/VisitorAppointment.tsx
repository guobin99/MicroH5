import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Checkbox, Input, NavBar, Picker, TextArea, Toast } from 'antd-mobile';
import { ShareAltOutlined, UserAddOutlined } from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import { makeId, maskIdCard, maskPhone } from '../lib/utils';

const departments = ['技术部', '人事部', '财务部', '行政部', '市场部'].map((item) => ({ label: item, value: item }));
const gates = ['东门', '办公楼大厅', '食堂入口'].map((item) => ({ label: item, value: item }));

export default function VisitorAppointment(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { user, addVisitorRecord } = useApp();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [idCard, setIdCard] = useState('');
  const [company, setCompany] = useState('');
  const [department, setDepartment] = useState('');
  const [gate, setGate] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [companions, setCompanions] = useState('0');
  const [plate, setPlate] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [deptVisible, setDeptVisible] = useState(false);
  const [gateVisible, setGateVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    if (!name.trim()) { Toast.show({ content: '请输入访客姓名', position: 'center' }); return false; }
    if (!/^1[3-9]\d{9}$/.test(phone)) { Toast.show({ content: '请输入正确手机号', position: 'center' }); return false; }
    if (!/^\d{17}[\dXx]$/.test(idCard)) { Toast.show({ content: '请输入正确身份证号', position: 'center' }); return false; }
    if (!department) { Toast.show({ content: '请选择受访部门', position: 'center' }); return false; }
    if (!gate) { Toast.show({ content: '请选择授权门点', position: 'center' }); return false; }
    if (!date) { Toast.show({ content: '请选择来访日期', position: 'center' }); return false; }
    if (!/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(time)) { Toast.show({ content: '来访时段格式如 09:00-11:00', position: 'center' }); return false; }
    if (!reason.trim()) { Toast.show({ content: '请输入来访事由', position: 'center' }); return false; }
    if (!agreed) { Toast.show({ content: '请先阅读并同意访客隐私授权协议', position: 'center' }); return false; }
    return true;
  };

  const submit = (): void => {
    if (!validate()) return;
    setLoading(true);
    window.setTimeout(() => {
      addVisitorRecord({
        id: makeId('VR'),
        visitorName: name.trim(),
        visitorPhone: maskPhone(phone),
        idCard: maskIdCard(idCard),
        company: company.trim(),
        department,
        reason: reason.trim(),
        visitDate: date,
        visitTime: time,
        companions: Math.max(0, Number(companions) || 0),
        plate: plate.trim(),
        status: 'pending',
        applyTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      });
      setLoading(false);
      Toast.show({ content: '预约已提交，等待审批', position: 'center' });
      setLocation('/visitor-records');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar
        onBack={() => setLocation('/')}
        className="bg-white"
        right={<Button size="small" fill="outline" onClick={() => setLocation('/visitor-register')}><ShareAltOutlined /> 访客登记</Button>}
      >
        访客预约
      </NavBar>

      <div className="p-4 space-y-4">
        <Card className="!rounded-2xl !border !border-gray-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center text-xl"><UserAddOutlined /></div>
            <div>
              <div className="font-semibold text-gray-900">被访人发起预约</div>
              <div className="text-xs text-gray-500 mt-1">提交后按平台审批流流转，结果推送双方</div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block"><span className="text-sm text-gray-600">访客姓名 *</span><Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" value={name} onChange={setName} placeholder="请输入访客姓名" /></label>
            <label className="block"><span className="text-sm text-gray-600">手机号码 *</span><Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" type="tel" value={phone} onChange={setPhone} placeholder="证件号、手机号将脱敏存储" /></label>
            <label className="block"><span className="text-sm text-gray-600">身份证号 *</span><Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" value={idCard} onChange={setIdCard} placeholder="请输入18位身份证号" /></label>
            <label className="block"><span className="text-sm text-gray-600">来访单位</span><Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" value={company} onChange={setCompany} placeholder="选填" /></label>

            <div className="grid grid-cols-2 gap-3">
              <button className="text-left" onClick={() => setDeptVisible(true)}>
                <span className="text-sm text-gray-600">受访部门 *</span>
                <div className="mt-2 h-11 bg-gray-50 rounded-xl px-3 flex items-center text-gray-700">{department || '请选择'}</div>
              </button>
              <button className="text-left" onClick={() => setGateVisible(true)}>
                <span className="text-sm text-gray-600">授权门点 *</span>
                <div className="mt-2 h-11 bg-gray-50 rounded-xl px-3 flex items-center text-gray-700">{gate || '请选择'}</div>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-sm text-gray-600">来访日期 *</span><input className="mt-2 w-full h-11 bg-gray-50 rounded-xl px-3 outline-none" type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} /></label>
              <label className="block"><span className="text-sm text-gray-600">来访时段 *</span><Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" value={time} onChange={setTime} placeholder="09:00-11:00" /></label>
            </div>

            <label className="block"><span className="text-sm text-gray-600">来访事由 *</span><TextArea className="mt-2 !bg-gray-50 !rounded-xl !p-3" rows={3} maxLength={100} showCount value={reason} onChange={setReason} placeholder="请输入来访事由" /></label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-sm text-gray-600">随行人数</span><Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" type="number" value={companions} onChange={setCompanions} /></label>
              <label className="block"><span className="text-sm text-gray-600">车牌号</span><Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" value={plate} onChange={setPlate} placeholder="选填" /></label>
            </div>

            <div className="flex items-start gap-2 pt-1">
              <Checkbox checked={agreed} onChange={setAgreed} />
              <span className="text-xs text-gray-500 leading-5">我已阅读并同意《访客隐私授权协议》，并确认访客知悉其个人信息仅用于本次来访核验。</span>
            </div>

            <Button block color="primary" size="large" loading={loading} className="!rounded-full !h-12" onClick={submit}>提交预约审批</Button>
          </div>
        </Card>

        <div className="text-center text-xs text-gray-400 leading-5">预约成功后可分享邀请页给访客补充信息；凭证仅在预约时段与授权门点内有效。</div>
      </div>

      <Picker
        columns={[departments]}
        visible={deptVisible}
        onClose={() => setDeptVisible(false)}
        onConfirm={(value) => {
          setDepartment(String(value[0] || ''));
          setDeptVisible(false);
        }}
      />
      <Picker
        columns={[gates]}
        visible={gateVisible}
        onClose={() => setGateVisible(false)}
        onConfirm={(value) => {
          setGate(String(value[0] || ''));
          setGateVisible(false);
        }}
      />
    </div>
  );
}
