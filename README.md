# dhtoan.github.io — trang giới thiệu + press kit

Trang tĩnh, không cần build, không tải gì từ bên ngoài.

| File | Nội dung |
|---|---|
| `index.html` | Trang giới thiệu tiếng Anh (trang chính, có schema.org `ProfilePage` + `Person`) |
| `vi/index.html` | Trang giới thiệu tiếng Việt (trỏ về cùng `Person`) |
| `press/index.html` | Press kit tiếng Anh: số liệu, 3 bản tiểu sử có nút Copy, gợi ý câu chuyện, liên hệ |
| `BIO.md` | Tiểu sử EN/VI dùng chung cho YouTube, IMDb, mạng xã hội (không có thông tin riêng tư; có thể nằm trong repo) |
| `assets/site.css` | Giao diện (sáng/tối tự động, điện thoại) |
| `assets/lang.js` | Tự chuyển EN/VI |
| `assets/reveal.js` | Hiệu ứng hiện dần khi cuộn (tắt nếu máy bật "giảm chuyển động") |
| `sitemap.xml`, `robots.txt` | Cho Google |

## Tự chuyển ngôn ngữ
- Lần đầu vào trang: trình duyệt tiếng Việt **hoặc** múi giờ máy là Việt Nam → sang `/vi/`; còn lại → tiếng Anh.
- Bấm "Tiếng Việt" / "English" thì trang nhớ lựa chọn (localStorage), lần sau không tự chuyển nữa.
- Bot của Google không bị chuyển hướng; hai trang nối với nhau bằng `hreflang`, nên đều được lập chỉ mục.
- Link có `?lang=…` thì không tự chuyển. Ví dụ gửi cho báo Mỹ: `https://dhtoan.github.io/?lang=en`.

## Cần điền trước khi đăng
1. **Email**: tìm comment `EMAIL` trong `index.html`, `vi/index.html`, `press/index.html` và thay link "Contact via YouTube" bằng `<a href="mailto:...">...</a>`.
2. **Ảnh chân dung**: lưu ảnh vuông ≥ 800×800 tại `assets/portrait.jpg`, rồi thay khối `<div class="portrait">DT</div>` bằng thẻ `<img>` ghi trong comment ngay phía trên. Ảnh này cũng là ảnh khi chia sẻ link lên mạng xã hội (`og:image`).
3. **Google Search Console**: thêm thẻ `google-site-verification` vào chỗ comment trong `<head>` của `index.html`.

## Đăng lên GitHub Pages (miễn phí)
1. Trên github.com (tài khoản **dhtoan**): **New repository**, tên chính xác `dhtoan.github.io`, chế độ Public.
2. Trong thư mục này:
   ```bash
   git init && git add . && git commit -m "Personal site and press kit" && git branch -M main && git remote add origin https://github.com/dhtoan/dhtoan.github.io.git && git push -u origin main
   ```
3. Repo → **Settings → Pages**: Source = *Deploy from a branch*, branch `main`, thư mục `/ (root)`. Vài phút sau trang chạy ở https://dhtoan.github.io/.
4. **Search Console**: thêm property `https://dhtoan.github.io/`, xác minh bằng thẻ HTML (bước 3 ở trên), rồi gửi `sitemap.xml`.
5. Thêm link `https://dhtoan.github.io/` vào phần About (Links) của @dhtoan, @jdfamilia, @MapADay, để Google nối các hồ sơ với nhau.

## Khi cập nhật số liệu
Sửa `BIO.md` trước, rồi chép đúng câu sang 3 trang HTML và About các kênh. Cập nhật `dateModified` trong JSON-LD và `lastmod` trong `sitemap.xml`.
