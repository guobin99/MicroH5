// 图片压缩：把用户选中的图片缩到长边 maxSide 并转成 JPEG dataURL。
// 目的：意见反馈要把图片随 JSON 一起提交（base64 会比原文件大约 1/3），
// 手机直出照片动辄 3~6MB，不压缩很容易被服务端 2MB/张的限额挡掉。
export function compressImage(file: File, maxSide = 1280, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve('');
    reader.onload = () => {
      const raw = String(reader.result || '');
      if (!raw) { resolve(''); return; }
      const img = new Image();
      img.onerror = () => resolve(raw); // 解不出来就交原图，交给服务端校验
      img.onload = () => {
        try {
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(raw); return; }
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch {
          resolve(raw);
        }
      };
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
}
