import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Checkbox, Input, Modal, NavBar, Picker, TextArea, Toast } from 'antd-mobile';
import { CameraOutlined, ShareAltOutlined, UserAddOutlined } from '@ant-design/icons';
import { useApp } from '../context/AppContext';

// 访客类型：写入 VisitorApply.visitor_type（中文，便于后台报表）
const visitorTypes = ['供应商', '客户', '合作伙伴', '个人访客', '临时访客'].map((item) => ({ label: item, value: item }));

export default function VisitorAppointment(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { user, addVisitorRecord } = useApp();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [idCard, setIdCard] = useState('');
  const [company, setCompany] = useState('');
  const [visitorType, setVisitorType] = useState('临时访客');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [reason, setReason] = useState('');
  const [companions, setCompanions] = useState('0');
  const [plate, setPlate] = useState('');
  const [carryItems, setCarryItems] = useState('');
  const [photo, setPhoto] = useState('');
  const [photoOpen, setPhotoOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [typeVisible, setTypeVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const pickPhoto = (file?: File): void => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { Toast.show({ content: '照片不能超过 2MB', position: 'center' }); return; }
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result || ''));
    reader.onerror = () => Toast.show({ content: '读取照片失败', position: 'center' });
    reader.readAsDataURL(file);
  };

  const validate = (): boolean => {
    if (!name.trim()) { Toast.show({ content: '请输入访客姓名', position: 'center' }); return false; }
    if (!/^1[3-9]\d{9}$/.test(phone)) { Toast.show({ content: '请输入正确手机号', position: 'center' }); return false; }
    if (idCard.trim().length < 6) { Toast.show({ content: '请输入正确的证件号码', position: 'center' }); return false; }
    if (!date) { Toast.show({ content: '请选择来访日期', position: 'center' }); return false; }
    if (!startTime || !endTime || endTime <= startTime) { Toast.show({ content: '结束时间需晚于开始时间', position: 'center' }); return false; }
    if (!reason.trim()) { Toast.show({ content: '请输入来访事由', position: 'center' }); return false; }
    if (!agreed) { Toast.show({ content: '请先阅读并同意访客隐私授权协议', position: 'center' }); return false; }
    return true;
  };

  // 明文提交（脱敏只在展示层做）；以后端结果为准，失败不跳转
  const submit = async (): Promise<void> => {
    if (!validate()) return;
    setLoading(true);
    const res = await addVisitorRecord({
      id: '',
      visitorName: name.trim(),
      visitorPhone: phone,
      idCard,
      company: company.trim(),
      reason: reason.trim(),
      visitDate: date,
      visitTime: `${startTime}-${endTime}`,
      companions: Math.max(0, Number(companions) || 0),
      plate: plate.trim(),
      status: 'pending',
      applyTime: '',
      visitorType,
    });
    setLoading(false);
    if (!res.success) {
      Toast.show({ content: res.msg || '提交失败', position: 'center' });
      return;
    }
    Toast.show({ content: '预约已提交，等待审批', position: 'center' });
    setLocation('/visitor-records');
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
            <label className="block"><span className="text-sm text-gray-600">手机号码 *</span><Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" type="tel" value={phone} onChange={setPhone} placeholder="用于接收审批结果" /></label>
            <label className="block"><span className="text-sm text-gray-600">证件号码 *</span><Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" value={idCard} onChange={setIdCard} placeholder="身份证 / 护照等，仅用于现场核验" /></label>
            <label className="block"><span className="text-sm text-gray-600">来访单位</span><Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" value={company} onChange={setCompany} placeholder="选填" /></label>

            <div className="rounded-xl bg-blue-50 p-3 text-xs text-[#0064E6] leading-5">
              被访人默认是你本人，受访部门按你的部门自动记录；授权门点由管理员统一配置（VIS.DoorRights）。
            </div>

            <button className="w-full text-left" onClick={() => setTypeVisible(true)}>
              <span className="text-sm text-gray-600">访客类型 *</span>
              <div className="mt-2 h-11 bg-gray-50 rounded-xl px-3 flex items-center text-gray-700">{visitorType || '请选择'}</div>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-sm text-gray-600">来访日期 *</span><input className="mt-2 w-full h-11 bg-gray-50 rounded-xl px-3 outline-none" type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block"><span className="text-sm text-gray-600">开始 *</span><input className="mt-2 w-full h-11 bg-gray-50 rounded-xl px-2 outline-none" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
                <label className="block"><span className="text-sm text-gray-600">结束 *</span><input className="mt-2 w-full h-11 bg-gray-50 rounded-xl px-2 outline-none" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label>
              </div>
            </div>

            <label className="block"><span className="text-sm text-gray-600">来访事由 *</span><TextArea className="mt-2 !bg-gray-50 !rounded-xl !p-3" rows={3} maxLength={100} showCount value={reason} onChange={setReason} placeholder="请输入来访事由" /></label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-sm text-gray-600">随行人数</span><Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" type="number" value={companions} onChange={setCompanions} /></label>
              <label className="block"><span className="text-sm text-gray-600">车牌号</span><Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" value={plate} onChange={setPlate} placeholder="选填" /></label>
            </div>

            <label className="block"><span className="text-sm text-gray-600">携带物品</span><TextArea className="mt-2 !bg-gray-50 !rounded-xl !p-3" rows={2} value={carryItems} onChange={setCarryItems} placeholder="选填，如笔记本电脑、样品箱" /></label>

            <div>
              <span className="text-sm text-gray-600">访客照片</span>
              {photo ? (
                <div className="mt-2 flex items-center gap-3">
                  <img src={photo} alt="访客照片" className="w-24 h-24 rounded-xl object-cover border border-gray-100" onClick={() => setPhotoOpen(true)} />
                  <div className="text-xs text-gray-500 leading-5">
                    <div>点击照片可查看大图</div>
                    <button className="text-[#0064E6] mt-1" onClick={() => setPhoto('')}>重新拍摄</button>
                  </div>
                </div>
              ) : (
                <label className="mt-2 block border border-dashed border-gray-200 rounded-2xl p-4 text-center cursor-pointer">
                  <input className="hidden" type="file" accept="image/*" capture="user" onChange={(event) => pickPhoto(event.target.files?.[0])} />
                  <div className="text-sm text-gray-700">采集访客照片（可选）</div>
                  <div className="text-xs text-gray-400 mt-1">用于前台核验，单张不超过 2MB</div>
                </label>
              )}
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

      <Modal
        visible={photoOpen}
        title="访客照片"
        content={photo ? <img src={photo} alt="访客照片" className="w-full rounded-xl" /> : null}
        closeOnAction
        actions={[{ key: 'close', text: '关闭', primary: true }]}
        onClose={() => setPhotoOpen(false)}
      />

      <Picker
        columns={[visitorTypes]}
        visible={typeVisible}
        onClose={() => setTypeVisible(false)}
        onConfirm={(value) => {
          setVisitorType(String(value[0] || '临时访客'));
          setTypeVisible(false);
        }}
      />
    </div>
  );
}
