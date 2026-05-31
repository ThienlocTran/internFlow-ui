# Cơ chế Upload Ảnh Điểm Danh

## Tổng quan
Hệ thống đã implement đầy đủ cơ chế upload ảnh với các tính năng:
- ✅ Auto-upload khi chọn ảnh
- ✅ Lưu URL vào localStorage (không mất sau F5)
- ✅ Ưu tiên lấy ảnh từ nhiều nguồn
- ✅ Nút checkout hoạt động đúng logic

## Luồng hoạt động

### 1. Checkin (Vào ca)
```
User chọn ảnh TimeMark vào ca
  ↓
Ảnh được lưu vào state (files["checkin-personal"])
  ↓
User bấm nút "Checkin"
  ↓
Upload ảnh lên Cloudinary
  ↓
Gọi API checkin với URL ảnh
  ↓
Lưu vào database
```

**Lưu ý:** Ảnh checkin **KHÔNG** auto-upload, chỉ upload khi bấm nút Checkin.

### 2. Checkout (Tan ca) - AUTO UPLOAD

```
User chọn ảnh TimeMark tan ca
  ↓
handleFileChange() được gọi
  ↓
Auto-upload ảnh lên Cloudinary ngay lập tức
  ↓
Lưu URL vào localStorage với key: userId|date|shiftId|checkout-personal
  ↓
Update state allDraftUrls
  ↓
User bấm F5 → Ảnh vẫn hiển thị từ localStorage
  ↓
User bấm nút "Checkout"
  ↓
Ưu tiên lấy URL: file mới → DB → localStorage
  ↓
Gọi API checkout với URL
  ↓
Xóa draft từ localStorage
```

## Code Implementation

### Auto-upload khi chọn ảnh checkout

```typescript
const handleFileChange = (slotKey: SlotKey, file: File | undefined) => {
  setFile(slotKey, file);
  if (!file) return;
  
  // Auto-upload ngay lập tức
  void uploadImage(file).then(({ url }) => {
    const key = ck(slotKey);
    writeDraft(key, url);  // Lưu vào localStorage
    setAllDraftUrls((prev) => ({ ...prev, [key]: url }));
  });
};
```

### Hiển thị ảnh sau F5

```typescript
<ImagePicker
  label="Ảnh TimeMark tan ca"
  file={files["checkout-personal"]}
  imageUrl={currentAttendance?.checkoutTimemarkImageUrl}  // Từ DB
  cachedUrl={getDraft("checkout-personal")}  // Từ localStorage
  onChange={(file) => handleFileChange("checkout-personal", file)}
/>
```

### Logic checkout ưu tiên

```typescript
const checkoutMutation = useMutation({
  mutationFn: async () => {
    // Ưu tiên 1: File vừa chọn
    const checkoutPersonalFile = files["checkout-personal"];
    
    // Ưu tiên 2: Đã lưu trong DB
    const savedTimemarkUrl = currentAttendance.checkoutTimemarkImageUrl;
    
    // Ưu tiên 3: Draft từ localStorage (sau F5)
    const draftPersonalKey = `${user?.id}|${attendanceDate}|${selectedShift?.id}|checkout-personal`;
    const draftTimemarkUrl = allDraftUrls[draftPersonalKey];

    // Validate
    if (!checkoutPersonalFile && !savedTimemarkUrl && !draftTimemarkUrl) {
      throw new Error("Ảnh TimeMark tan ca là bắt buộc.");
    }

    // Lấy URL theo thứ tự ưu tiên
    const timemarkUrl = checkoutPersonalFile
      ? (await uploadImage(checkoutPersonalFile)).url  // Upload mới
      : savedTimemarkUrl ?? draftTimemarkUrl!;  // Dùng có sẵn

    return checkout(currentAttendance.id, {
      timemarkImageUrl: timemarkUrl,
      groupImageUrl: groupUrl,
    });
  },
});
```

## localStorage Key Format

```
{userId}|{date}|{shiftId}|{slotKey}
```

**Ví dụ:**
```
123e4567-e89b-12d3-a456-426614174000|2026-05-18|456e7890-e89b-12d3-a456-426614174001|checkout-personal
```

## Điều kiện Enable/Disable nút Checkout

### Nút Checkout được ENABLE khi:
1. ✅ Đã checkin (`currentAttendance` tồn tại)
2. ✅ Chưa checkout (`status !== "CHECKED_OUT"`)
3. ✅ Không đang xử lý (`!isBusy`)

### Nút Checkout bị DISABLE khi:
1. ❌ Chưa checkin
2. ❌ Đã checkout rồi
3. ❌ Đang xử lý (uploading/saving)

## Messages hiển thị

```typescript
{!currentAttendance && (
  <p className="text-sm text-amber-600">
    ⚠️ Bạn cần checkin trước khi có thể checkout
  </p>
)}

{currentAttendance?.status === "CHECKED_OUT" && (
  <p className="text-sm text-emerald-600">
    ✓ Bạn đã checkout ca này rồi
  </p>
)}

{currentAttendance && !hasCheckoutImage && (
  <p className="text-sm text-amber-600">
    💡 Chọn ảnh TimeMark tan ca để có thể checkout
  </p>
)}
```

## Xử lý sau khi Checkout thành công

```typescript
onSuccess: () => {
  setMessage("Checkout thành công.");
  queryClient.invalidateQueries({ queryKey: ["attendances", user?.id, attendanceDate] });
  
  // Xóa draft từ localStorage
  const keysToRemove = [
    `${user?.id}|${attendanceDate}|${selectedShift?.id}|checkout-personal`,
    `${user?.id}|${attendanceDate}|${selectedShift?.id}|checkout-group`,
  ];
  removeDrafts(keysToRemove);
  
  // Xóa từ state
  setAllDraftUrls((prev) => {
    const next = { ...prev };
    keysToRemove.forEach((k) => delete next[k]);
    return next;
  });
}
```

## Troubleshooting

### Vấn đề: Nút Checkout bị disable

**Nguyên nhân:**
1. Chưa checkin → Cần bấm nút "Checkin" trước
2. Đã checkout rồi → Không thể checkout lại
3. Đang xử lý → Đợi upload/save hoàn tất

**Giải pháp:**
- Kiểm tra badge trạng thái: "Chưa checkin" / "Đã checkin" / "Đã checkout"
- Đọc message phía dưới nút Checkout
- Đảm bảo đã chọn ảnh TimeMark vào ca và bấm Checkin

### Vấn đề: Ảnh mất sau F5

**Nguyên nhân:** localStorage bị xóa hoặc key không đúng

**Giải pháp:**
1. Kiểm tra localStorage trong DevTools:
   ```javascript
   localStorage.getItem("internflow-attendance-drafts")
   ```
2. Đảm bảo userId, date, shiftId đúng
3. Kiểm tra console có lỗi upload không

### Vấn đề: Upload ảnh thất bại

**Nguyên nhân:**
- Cloudinary API key sai
- File quá lớn
- Network error

**Giải pháp:**
1. Kiểm tra `.env`:
   ```
   VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
   VITE_CLOUDINARY_UPLOAD_PRESET=your-preset
   ```
2. Kiểm tra console log
3. Thử upload ảnh nhỏ hơn

## Testing Checklist

### Test Case 1: Upload và F5
1. ✅ Chọn ảnh TimeMark vào ca
2. ✅ Bấm Checkin
3. ✅ Chọn ảnh TimeMark tan ca (auto-upload)
4. ✅ F5 trang
5. ✅ Ảnh tan ca vẫn hiển thị
6. ✅ Bấm Checkout thành công

### Test Case 2: Checkout với ảnh từ localStorage
1. ✅ Checkin
2. ✅ Chọn ảnh tan ca (auto-upload)
3. ✅ F5 trang
4. ✅ Không chọn ảnh mới
5. ✅ Bấm Checkout → Dùng ảnh từ localStorage

### Test Case 3: Checkout với ảnh mới
1. ✅ Checkin
2. ✅ Chọn ảnh tan ca A (auto-upload)
3. ✅ Chọn ảnh tan ca B (file mới)
4. ✅ Bấm Checkout → Dùng ảnh B (ưu tiên file mới)

### Test Case 4: Đã checkout rồi
1. ✅ Checkin và Checkout thành công
2. ✅ F5 trang
3. ✅ Nút Checkout bị disable
4. ✅ Hiển thị "Đã checkout ca này rồi"

## Best Practices

### 1. Luôn checkin trước khi checkout
```
Checkin → Upload ảnh giữa ca → Chọn ảnh tan ca → Checkout
```

### 2. Chọn ảnh tan ca sớm
- Chọn ảnh tan ca trước khi hết ca
- Hệ thống sẽ auto-upload và lưu vào localStorage
- Nếu có sự cố, ảnh vẫn còn sau F5

### 3. Kiểm tra trạng thái
- Xem badge: "Chưa checkin" / "Đã checkin" / "Đã checkout"
- Đọc message dưới nút Checkout
- Kiểm tra ảnh đã hiển thị chưa

### 4. Xử lý lỗi
- Nếu upload thất bại, thử lại
- Nếu checkout thất bại, kiểm tra ảnh
- Nếu F5 mất ảnh, kiểm tra localStorage

## Summary

✅ **Cơ chế đã hoạt động đúng:**
- Auto-upload ảnh checkout
- Lưu vào localStorage
- Không mất sau F5
- Nút checkout enable khi đã checkin

❌ **Lỗi thường gặp:**
- Chưa checkin → Nút checkout disable
- Chưa chọn ảnh → Không thể checkout
- localStorage bị xóa → Mất ảnh sau F5

💡 **Tips:**
- Checkin trước, checkout sau
- Chọn ảnh tan ca sớm
- Kiểm tra trạng thái trước khi checkout
