import React, { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Checkbox, Input, NavBar, SearchBar, TextArea, Toast } from 'antd-mobile';
import { CameraOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import { makeId, maskIdCard, maskPhone } from '../lib/utils';

const respondents = [
  { name: '张三', department: '技术部' },
  { name: '陈敏', department: '人事部' },
  { name: '刘洋', department: '财务部' },
  { name: '周洁', department: '行政部' },
  { name: '赵磊', department: '市场部' },
];

export default function VisitorRegister(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { addVisitorRecord } = useApp();
  const [keyword, setKeyword] = useState('');
  const [respondent, setRespondent] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [idCard, setIdCard] = useState('');
  const [company, setCompany] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [faceFileName, setFaceFileName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const filteredRespondents = useMemo(() => respondents.filter((item) =>
    !keyword || item.name.includes(keyword) || item.department.includes(keyword),
  ), [keyword]);

  const validate = (): boolean => {
    if (!respondent) { Toast.show({ content: '请搜索并选择被访人', position: 'center' }); return false; }
    if (!name.trim()) { Toast.show({ content: '请输入访客姓名', position: 'center' }); return false; }
    if (!/^1[3-9]\d{9}$/.test(phone)) { Toast.show({ content: '请输入正确手机号', position: 'center' }); return false; }
    if (!/^\d{17}[\dXx]$/.test(idCard)) { Toast.show({ content: '请输入正确身份证号', position: 'center' }); return false; }
    if (!date || !time || !reason.trim()) { Toast.show({ content: '请完善来访时间、时段与事由', position: 'center' }); return false; }
    if (!agreed) { Toast.show({ content: '请先同意隐私授权协议', position: 'center' }); return false; }
    return true;
  };

  const submit = (): void => {
    if (!validate()) return;
    setLoading(true);
    window.setTimeout(() => {
      const target = respondents.find((item) => `${item.name}（${item.department}）` === respondent)!;
      addVisitorRecord({
        id: makeId('VR'),
        visitorName: name.trim(),
        visitorPhone: maskPhone(phone),
        idCard: maskIdCard(idCard),
        company: company.trim(),
        department: target.department,
        reason: `${reason.trim()}（被访人：${target.name}）`,
        visitDate: date,
        visitTime: time,
        companions: 0,
        status: 'pending',
        applyTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      });
      setLoading(false);
      Toast.show({ content: '登记已提交，等待审批', position: 'center' });
      setLocation('/visitor-records');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar onBack={() => setLocation('/visitor-appointment')} className="bg-white">访客自助登记</NavBar>
      <div className="p-4 space-y-4">
        <Card className="!rounded-2xl !border !border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">选择被访人</h2>
          <SearchBar placeholder="按姓名或部门搜索" value={keyword} onChange={setKeyword} />
          <div className="grid grid-cols-2 gap-2 mt-3">
            {filteredRespondents.map((item) => {
              const value = `${item.name}（${item.department}）`;
              const selected = respondent === value;
              return (
                <button key={value} className={`rounded-xl p-3 text-left border ${selected ? 'border-[#0064E6] bg-blue-50' : 'border-gray-100 bg-gray-50'}`} onClick={() => setRespondent(value)}>
                  <div className="flex items-center gap-2"><UserOutlined className={selected ? 'text-[#0064E6]' : 'text-gray-400'} /><span className="font-semibold text-gray-900">{item.name}</span></div>
                  <div className="text-xs text-gray-500 mt-1">{item.department}</div>
                </button>
              );
            })}
          </div>
          {filteredRespondents.length === 0 && <div className="text-center text-sm text-gray-400 py-5"><SearchOutlined /> 未找到被访人</div>}
        </Card>

        <Card className="!rounded-2xl !border !border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">访客信息</h2>
          <div className="space-y-4">
            <label className="block"><span className="text-sm text-gray-600">姓名 *</span><Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" value={name} onChange={setName} placeholder="请输入姓名" /></label>
            <label className="block"><span className="text-sm text-gray-600">手机号 *</span><Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" type="tel" value={phone} onChange={setPhone} placeholder="用于接收审批结果" /></label>
            <label className="block"><span className="text-sm text-gray-600">身份证号 *</span><Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" value={idCard} onChange={setIdCard} placeholder="脱敏存储，仅用于核验" /></label>
            <label className="block"><span className="text-sm text-gray-600">来访单位</span><Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" value={company} onChange={setCompany} placeholder="选填" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-sm text-gray-600">来访日期 *</span><input className="mt-2 w-full h-11 bg-gray-50 rounded-xl px-3 outline-none" type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => setDate(event.target.value)} /></label>
              <label className="block"><span className="text-sm text-gray-600">来访时段 *</span><Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" value={time} onChange={setTime} placeholder="14:00-16:00" /></label>
            </div>
            <label className="block"><span className="text-sm text-gray-600">来访事由 *</span><TextArea className="mt-2 !bg-gray-50 !rounded-xl !p-3" rows={3} value={reason} onChange={setReason} placeholder="请输入来访事由" /></label>
            <label className="block border border-dashed border-gray-200 rounded-2xl p-4 text-center cursor-pointer">
              <input className="hidden" type="file" accept="image/*" capture="user" onChange={(event) => setFaceFileName(event.target.files?.[0]?.name || '')} />
              <CameraOutlined className="text-2xl text-[#0064E6]" />
              <div className="text-sm text-gray-700 mt-2">{faceFileName || '采集访客人脸照片（如需刷脸通行）'}</div>
              <div className="text-xs text-gray-400 mt-1">仅在单独授权后采集并加密存储</div>
            </label>
            <div className="flex items-start gap-2">
              <Checkbox checked={agreed} onChange={setAgreed} />
              <span className="text-xs text-gray-500 leading-5">我已阅读并同意《访客隐私授权协议》，同意为本次来访登记提供上述信息。</span>
            </div>
            <Button block color="primary" size="large" loading={loading} className="!rounded-full !h-12" onClick={submit}>提交登记</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
