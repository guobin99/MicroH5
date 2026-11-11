import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Card, Checkbox, Input, Modal, NavBar, Picker, SearchBar, TextArea, Toast } from 'antd-mobile';
import { CameraOutlined, CheckCircleFilled, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import { m } from '../lib/api';

// 访客类型：与「访客预约」保持一致，写入 VisitorApply.visitor_type
const visitorTypes = ['供应商', '客户', '合作伙伴', '个人访客', '临时访客'].map((item) => ({ label: item, value: item }));

interface Staff {
  personId: number;
  personNo: string;
  personName: string;
  deptName: string;
}

export default function VisitorRegister(): React.JSX.Element {
  const [, setLocation] = useLocation();
  const { addVisitorRecord } = useApp();

  // 被访人：从 ST_Person 实时搜索（原来用写死的 5 个假人，选了也不生效）
  const [keyword, setKeyword] = useState('');
  const [staff, setStaff] = useState<Staff[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [respondent, setRespondent] = useState<Staff | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [idCard, setIdCard] = useState('');
  const [company, setCompany] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [reason, setReason] = useState('');
  const [visitorType, setVisitorType] = useState('临时访客');
  const [typeVisible, setTypeVisible] = useState(false);
  const [companions, setCompanions] = useState('0');
  const [plate, setPlate] = useState('');
  const [carryItems, setCarryItems] = useState('');
  const [photo, setPhoto] = useState('');
  const [photoOpen, setPhotoOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  // 先输入再查：空关键字不请求，避免一进页面就甩出 20 个无关人员（也少暴露一层人员名单）
  useEffect(() => {
    const kw = keyword.trim();
    if (!kw) {
      setStaff([]);
      setSearchError('');
      setSearching(false);
      return;
    }
    let alive = true;
    setSearching(true);
    const timer = window.setTimeout(() => {
      m.visitorPersons(kw)
        .then((rows) => {
          if (!alive) return;
          setStaff(Array.isArray(rows) ? rows : []);
          setSearchError(Array.isArray(rows) ? '' : '被访人查询返回异常');
        })
        .catch(() => {
          if (!alive) return;
          setStaff([]);
          // 404/500 与「确实没有这个人」必须区分开
          setSearchError('被访人加载失败，请检查网络或联系管理员');
        })
        .finally(() => { if (alive) setSearching(false); });
    }, 300);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [keyword]);

  // 选照片：本地读成 dataURL 用于缩略图/放大，提交时一并上传
  const pickPhoto = (file?: File): void => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      Toast.show({ content: '照片不能超过 2MB', position: 'center' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result || ''));
    reader.onerror = () => Toast.show({ content: '读取照片失败', position: 'center' });
    reader.readAsDataURL(file);
  };

  const validate = (): boolean => {
    if (!respondent) { Toast.show({ content: '请搜索并选择被访人', position: 'center' }); return false; }
    if (!name.trim()) { Toast.show({ content: '请输入访客姓名', position: 'center' }); return false; }
    if (!/^1[3-9]\d{9}$/.test(phone)) { Toast.show({ content: '请输入正确手机号', position: 'center' }); return false; }
    if (idCard.trim().length < 6) { Toast.show({ content: '请输入正确的证件号码', position: 'center' }); return false; }
    if (!date) { Toast.show({ content: '请选择来访日期', position: 'center' }); return false; }
    if (!startTime || !endTime || endTime <= startTime) {
      Toast.show({ content: '结束时间需晚于开始时间', position: 'center' });
      return false;
    }
    if (!reason.trim()) { Toast.show({ content: '请填写来访事由', position: 'center' }); return false; }
    if (!agreed) { Toast.show({ content: '请先同意隐私授权协议', position: 'center' }); return false; }
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
      idCard: idCard.trim(),
      company: company.trim(),
      department: respondent ? respondent.deptName : '',
      reason: reason.trim(),
      visitDate: date,
      visitTime: `${startTime}-${endTime}`,
      companions: Math.max(0, Number(companions) || 0),
      plate: plate.trim(),
      status: 'pending',
      applyTime: '',
      visitorType,
      carryItems: carryItems.trim(),
      respondentId: respondent ? respondent.personId : undefined,
      photo,
    });
    setLoading(false);
    if (!res.success) {
      Toast.show({ content: res.msg || '提交失败', position: 'center' });
      return;
    }
    // 为别人登记时，记录归被访人，提交人自己的「访客记录」里看不到 → 不要跳过去
    if (res.isSelf === false) {
      Toast.show({ content: `已提交，等待 ${res.respondentName || '被访人'} 审批`, position: 'center' });
      setLocation('/');
      return;
    }
    Toast.show({ content: '登记已提交，等待审批', position: 'center' });
    setLocation('/visitor-records');
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NavBar onBack={() => setLocation('/visitor-appointment')} className="bg-white">访客自助登记</NavBar>
      <div className="p-4 space-y-4">
        <Card className="!rounded-2xl !border !border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">选择被访人</h2>

          {respondent ? (
            <div className="flex items-center justify-between rounded-xl border border-[#0064E6] bg-blue-50 p-3">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircleFilled className="text-[#0064E6]" />
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 truncate">
                    {respondent.personName}
                    <span className="text-xs text-gray-500 font-normal ml-2">工号 {respondent.personNo}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 truncate">{respondent.deptName || '—'}</div>
                </div>
              </div>
              <button
                className="text-xs text-gray-500 shrink-0 ml-3"
                onClick={() => { setRespondent(null); setKeyword(''); }}
              >
                重新选择
              </button>
            </div>
          ) : (
            <>
              <SearchBar placeholder="输入姓名或工号搜索被访人" value={keyword} onChange={setKeyword} />
              <div className="mt-3 max-h-64 overflow-y-auto space-y-2">
                {!keyword.trim() && (
                  <div className="text-center text-sm text-gray-400 py-8">
                    <SearchOutlined /> 输入姓名或工号后显示匹配人员
                  </div>
                )}
                {keyword.trim() && searching && <div className="text-center text-xs text-gray-400 py-4">搜索中…</div>}
                {keyword.trim() && !searching && staff.length === 0 && (
                  <div className={`text-center text-sm py-5 ${searchError ? 'text-red-500' : 'text-gray-400'}`}>
                    {searchError || <><SearchOutlined /> 没有匹配的人员，换个姓名或工号试试</>}
                  </div>
                )}
                {!searching && staff.map((item) => (
                  <button
                    key={item.personId}
                    className="w-full rounded-xl p-3 text-left border border-gray-100 bg-gray-50 flex items-center gap-2"
                    onClick={() => setRespondent(item)}
                  >
                    <UserOutlined className="text-gray-400" />
                    <span className="font-semibold text-gray-900">{item.personName}</span>
                    <span className="text-xs text-gray-500">工号 {item.personNo}</span>
                    <span className="text-xs text-gray-400 ml-auto truncate max-w-[40%]">{item.deptName}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card className="!rounded-2xl !border !border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">访客信息</h2>
          <div className="space-y-4">
            <label className="block"><span className="text-sm text-gray-600">姓名 *</span><Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" value={name} onChange={setName} placeholder="请输入姓名" /></label>
            <label className="block"><span className="text-sm text-gray-600">手机号 *</span><Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" type="tel" value={phone} onChange={setPhone} placeholder="用于接收审批结果" /></label>
            <label className="block"><span className="text-sm text-gray-600">证件号码 *</span><Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" value={idCard} onChange={setIdCard} placeholder="身份证 / 护照等，仅用于现场核验" /></label>
            <label className="block"><span className="text-sm text-gray-600">来访单位</span><Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" value={company} onChange={setCompany} placeholder="选填" /></label>

            <button className="w-full text-left" onClick={() => setTypeVisible(true)}>
              <span className="text-sm text-gray-600">访客类型 *</span>
              <div className="mt-2 h-11 bg-gray-50 rounded-xl px-3 flex items-center text-gray-700">{visitorType || '请选择'}</div>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm text-gray-600">来访日期 *</span>
                <input className="mt-2 w-full h-11 bg-gray-50 rounded-xl px-3 outline-none" type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => setDate(event.target.value)} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-sm text-gray-600">开始 *</span>
                  <input className="mt-2 w-full h-11 bg-gray-50 rounded-xl px-2 outline-none" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
                </label>
                <label className="block">
                  <span className="text-sm text-gray-600">结束 *</span>
                  <input className="mt-2 w-full h-11 bg-gray-50 rounded-xl px-2 outline-none" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
                </label>
              </div>
            </div>

            <label className="block"><span className="text-sm text-gray-600">来访事由 *</span><TextArea className="mt-2 !bg-gray-50 !rounded-xl !p-3" rows={3} value={reason} onChange={setReason} placeholder="请输入来访事由" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-sm text-gray-600">随行人数</span><Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" type="number" value={companions} onChange={setCompanions} placeholder="0" /></label>
              <label className="block"><span className="text-sm text-gray-600">车牌号</span><Input className="mt-2 !h-11 !bg-gray-50 !rounded-xl !px-3" value={plate} onChange={setPlate} placeholder="选填" /></label>
            </div>

            <label className="block"><span className="text-sm text-gray-600">携带物品</span><TextArea className="mt-2 !bg-gray-50 !rounded-xl !p-3" rows={2} value={carryItems} onChange={setCarryItems} placeholder="选填，如笔记本电脑、样品箱" /></label>

            {/* 访客照片：缩略图可点开看大图 */}
            <div>
              <span className="text-sm text-gray-600">访客照片</span>
              {photo ? (
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src={photo}
                    alt="访客照片"
                    className="w-24 h-24 rounded-xl object-cover border border-gray-100"
                    onClick={() => setPhotoOpen(true)}
                  />
                  <div className="text-xs text-gray-500 leading-5">
                    <div>点击照片可查看大图</div>
                    <button className="text-[#0064E6] mt-1" onClick={() => setPhoto('')}>重新拍摄</button>
                  </div>
                </div>
              ) : (
                <label className="mt-2 block border border-dashed border-gray-200 rounded-2xl p-4 text-center cursor-pointer">
                  <input className="hidden" type="file" accept="image/*" capture="user" onChange={(event) => pickPhoto(event.target.files?.[0])} />
                  <CameraOutlined className="text-2xl text-[#0064E6]" />
                  <div className="text-sm text-gray-700 mt-2">采集访客照片（可选）</div>
                  <div className="text-xs text-gray-400 mt-1">用于前台核验，单张不超过 2MB</div>
                </label>
              )}
            </div>

            <div className="flex items-start gap-2">
              <Checkbox checked={agreed} onChange={setAgreed} />
              <span className="text-xs text-gray-500 leading-5">我已阅读并同意《访客隐私授权协议》，同意为本次来访登记提供上述信息。</span>
            </div>
            <Button block color="primary" size="large" loading={loading} className="!rounded-full !h-12" onClick={submit}>提交登记</Button>
          </div>
        </Card>
      </div>

      <Picker
        columns={[visitorTypes]}
        visible={typeVisible}
        onClose={() => setTypeVisible(false)}
        onConfirm={(value) => {
          setVisitorType(String(value[0] || '临时访客'));
          setTypeVisible(false);
        }}
      />

      <Modal
        visible={photoOpen}
        title="访客照片"
        content={photo ? <img src={photo} alt="访客照片" className="w-full rounded-xl" /> : null}
        closeOnAction
        actions={[{ key: 'close', text: '关闭', primary: true }]}
        onClose={() => setPhotoOpen(false)}
      />
    </div>
  );
}
