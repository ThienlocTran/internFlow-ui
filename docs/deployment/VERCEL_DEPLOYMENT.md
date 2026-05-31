# 🚀 Hướng dẫn Deploy Frontend lên Vercel

## 📋 Chuẩn bị

### 1. Đã có Backend URL từ Render
Ví dụ: `https://internflow.onrender.com`

### 2. Push code lên GitHub
```bash
cd d:\CheckSV\InternFlow-UI
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

---

## 🎯 Deploy lên Vercel

### Bước 1: Đăng nhập Vercel

1. Vào https://vercel.com
2. Click **"Sign Up"** hoặc **"Login"**
3. Chọn **"Continue with GitHub"**
4. Authorize Vercel truy cập GitHub

### Bước 2: Import Project

1. Vào Dashboard → Click **"Add New..."** → **"Project"**
2. Chọn repository **InternFlow-UI**
3. Click **"Import"**

### Bước 3: Cấu hình Project

#### Framework Preset
- Vercel tự động detect: **Vite**
- Giữ nguyên settings mặc định

#### Root Directory
- Để trống (hoặc `./` nếu cần)

#### Build Settings
- **Build Command**: `npm run build` (mặc định)
- **Output Directory**: `dist` (mặc định)
- **Install Command**: `npm install` (mặc định)

### Bước 4: Thêm Environment Variables ⭐

Click **"Environment Variables"** và thêm:

#### Variable 1: API Base URL
```
NAME: VITE_API_BASE_URL
VALUE: https://YOUR_BACKEND_URL/api
```

**Thay `YOUR_BACKEND_URL`** bằng URL backend từ Render

Ví dụ:
- Backend URL: `https://internflow.onrender.com`
- Thì điền: `https://internflow.onrender.com/api`

#### Variable 2: Google Client ID
```
NAME: VITE_GOOGLE_CLIENT_ID
VALUE: 548332785385-5t4pcftrhba9f0fj7lsnqourqgt9ik6e.apps.googleusercontent.com
```

**Lưu ý**: Chọn **All** (Production, Preview, Development) cho cả 2 biến

### Bước 5: Deploy

1. Click **"Deploy"**
2. Đợi 2-3 phút
3. Vercel sẽ build và deploy tự động

---

## ✅ Sau khi Deploy xong

### 1. Lấy Frontend URL

Vercel sẽ cung cấp URL dạng:
- `https://internflow-ui.vercel.app`
- hoặc `https://your-project-name.vercel.app`

### 2. Cập nhật CORS trên Backend (Render)

1. Vào Render Dashboard
2. Chọn Web Service **InternFlow** (backend)
3. Tab **Environment**
4. Tìm biến `CORS_ALLOWED_ORIGINS`
5. Sửa value thành frontend URL vừa lấy:
   ```
   https://internflow-ui.vercel.app
   ```
6. Click **"Save Changes"**
7. Đợi backend redeploy (1-2 phút)

### 3. Cập nhật Google OAuth Redirect URIs

Vào Google Cloud Console:

1. https://console.cloud.google.com
2. Chọn project **internflow-496202**
3. **APIs & Services** → **Credentials**
4. Click vào OAuth 2.0 Client ID
5. Thêm **Authorized JavaScript origins**:
   ```
   https://internflow-ui.vercel.app
   ```
6. Thêm **Authorized redirect URIs**:
   ```
   https://internflow-ui.vercel.app
   https://internflow-ui.vercel.app/auth/callback
   ```
   (Thay URL bằng URL thực tế của bạn)
7. Click **"Save"**

### 4. Test Frontend

1. Mở frontend URL: `https://internflow-ui.vercel.app`
2. Kiểm tra:
   - [ ] Trang load thành công
   - [ ] Không có CORS errors trong Console
   - [ ] API calls hoạt động
   - [ ] Google Login hoạt động
   - [ ] Upload ảnh hoạt động

---

## 🔧 Cập nhật Environment Variables (Nếu cần)

### Sau khi đã deploy:

1. Vào Vercel Dashboard
2. Chọn project **InternFlow-UI**
3. Tab **Settings** → **Environment Variables**
4. Sửa giá trị cần thay đổi
5. Click **"Save"**
6. Tab **Deployments** → Click **"..."** → **"Redeploy"**

---

## 🎨 Custom Domain (Optional)

### Nếu muốn dùng domain riêng:

1. Vào project → **Settings** → **Domains**
2. Click **"Add"**
3. Nhập domain của bạn (ví dụ: `internflow.com`)
4. Làm theo hướng dẫn cấu hình DNS
5. Đợi DNS propagate (5-30 phút)

**Nhớ cập nhật lại:**
- CORS trên backend
- Google OAuth redirect URIs

---

## 🔄 Auto Deploy

Vercel tự động deploy khi:
- Push code lên branch `main`
- Merge Pull Request

Để tắt auto deploy:
- Settings → Git → Bỏ tick **"Production Branch"**

---

## 🐛 Troubleshooting

### Build Failed

**Lỗi**: `npm install` failed

**Giải pháp**:
- Kiểm tra `package.json` có đúng không
- Xóa `node_modules` và `package-lock.json` local
- Commit lại và push

**Lỗi**: TypeScript errors

**Giải pháp**:
- Fix lỗi TypeScript trong code
- Hoặc tạm thời skip: Thêm vào Build Command: `npm run build -- --mode production`

### CORS Error

**Lỗi**: `Access-Control-Allow-Origin` error

**Giải pháp**:
1. Kiểm tra `CORS_ALLOWED_ORIGINS` trên backend Render
2. Đảm bảo có frontend URL chính xác
3. Không có `/` ở cuối URL
4. Phải là `https://` không phải `http://`

### API Calls Failed

**Lỗi**: `Failed to fetch` hoặc `Network Error`

**Giải pháp**:
1. Kiểm tra `VITE_API_BASE_URL` đúng chưa
2. Verify backend đang running (test health check)
3. Kiểm tra CORS đã cấu hình đúng

### Google Login Failed

**Lỗi**: `redirect_uri_mismatch`

**Giải pháp**:
1. Vào Google Cloud Console
2. Thêm frontend URL vào Authorized redirect URIs
3. Đảm bảo URL khớp chính xác (có/không có `/` cuối)

### Environment Variables không hoạt động

**Lỗi**: Biến vẫn là `undefined`

**Giải pháp**:
1. Đảm bảo tên biến bắt đầu bằng `VITE_`
2. Sau khi thêm/sửa biến, phải **Redeploy**
3. Clear cache browser và reload

---

## 📊 Monitoring

### Xem Logs

1. Vào project → **Deployments**
2. Click vào deployment muốn xem
3. Tab **"Build Logs"** hoặc **"Function Logs"**

### Analytics

1. Tab **Analytics** để xem:
   - Page views
   - Visitors
   - Performance metrics

---

## 💰 Pricing

### Free Tier (Hobby)
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Custom domains
- ✅ Preview deployments

### Pro ($20/month)
- Nhiều bandwidth hơn
- Team collaboration
- Password protection
- Advanced analytics

---

## 📝 Checklist Deploy

- [ ] Backend đã deploy lên Render
- [ ] Đã có backend URL
- [ ] Push frontend code lên GitHub
- [ ] Import project vào Vercel
- [ ] Thêm 2 environment variables
- [ ] Deploy thành công
- [ ] Lấy frontend URL
- [ ] Cập nhật CORS trên backend
- [ ] Cập nhật Google OAuth redirect URIs
- [ ] Test frontend hoạt động
- [ ] Test API calls
- [ ] Test Google Login
- [ ] Test upload ảnh

---

## 🎯 Workflow hoàn chỉnh

```
1. Deploy Backend (Render)
   ↓
2. Lấy Backend URL
   ↓
3. Cập nhật VITE_API_BASE_URL trong Vercel
   ↓
4. Deploy Frontend (Vercel)
   ↓
5. Lấy Frontend URL
   ↓
6. Cập nhật CORS_ALLOWED_ORIGINS trên Backend
   ↓
7. Cập nhật Google OAuth redirect URIs
   ↓
8. Test toàn bộ hệ thống
   ↓
9. ✅ Hoàn thành!
```

---

**Chúc bạn deploy thành công! 🎉**

Nếu gặp vấn đề, check:
- Vercel Docs: https://vercel.com/docs
- Vercel Community: https://github.com/vercel/vercel/discussions
