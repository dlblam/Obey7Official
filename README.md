# OBEY 7 — Professional Ebook Reader

## Cấu trúc
```text
/
├─ index.html
└─ public/
   ├─ css/style.css
   ├─ js/script.js
   └─ content/
      ├─ 1.txt
      ├─ 2.txt
      ├─ 3.txt
      └─ ...
```

## Quy tắc nội dung
- Web tự đọc tuần tự `1.txt`, `2.txt`, `3.txt`... cho đến file đầu tiên không tồn tại.
- **Mỗi file TXT là một đơn vị/chương độc lập.** Không nối chữ hoặc đoạn văn của file này sang file kế tiếp.
- Nếu một file dài hơn một trang, nó được chia thành nhiều trang.
- Thuật toán đo chiều cao trực tiếp trên font/kích thước trang và chỉ chia tại khoảng trắng, vì vậy không cắt đôi một từ.
- `\r\n` được chuẩn hóa thành `\n`, còn xuống dòng được giữ bằng `white-space: pre-wrap`.
- Ký tự Unicode và ký tự đặc biệt trong TXT được giữ nguyên. Nội dung được đưa vào DOM bằng `textContent`, không chạy như HTML.

## Chạy
Nên chạy bằng local server vì trình duyệt có thể chặn `fetch()` file TXT khi mở `index.html` bằng `file://`.

Ví dụ VS Code + Live Server, hoặc:
```bash
python -m http.server 8000
```
Sau đó mở `http://localhost:8000/`.

## Tính năng
- Bìa mở thành sách.
- Click nửa trái/phải để lật trang.
- Vuốt trên điện thoại.
- Mục lục theo từng file TXT.
- Tìm kiếm toàn bộ sách.
- Cỡ chữ / giãn dòng.
- Chế độ giấy cổ điển / ấm / đêm.
- Toàn màn hình.
- Thanh tiến trình.
- Phím mũi tên / PageUp / PageDown.
- Lưu thiết lập đọc bằng localStorage.
- Responsive PC + smartphone.
