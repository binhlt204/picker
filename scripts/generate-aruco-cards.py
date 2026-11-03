"""
Sinh bộ 50 thẻ ArUco DICT_4X4_100 ra file PDF sẵn sàng in.
- Trang 1: Trang hướng dẫn duy nhất về quy ước xoay thẻ và lưu ý sử dụng.
- Trang 2..51: 50 trang thẻ ArUco (mỗi thẻ 1 trang).

Chạy: python scripts/generate-aruco-cards.py
Output: scripts/output/aruco_cards_50.pdf
"""

import cv2
import numpy as np
from reportlab.lib.pagesizes import A5
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os
import tempfile

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'output')
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Đăng ký font hỗ trợ tiếng Việt Unicode nếu có sẵn
font_regular = "Helvetica"
font_bold = "Helvetica-Bold"

for font_dir in ["C:/Windows/Fonts", "/usr/share/fonts/truetype", "/Library/Fonts"]:
    arial_path = os.path.join(font_dir, "arial.ttf")
    arial_bold_path = os.path.join(font_dir, "arialbd.ttf")
    if os.path.exists(arial_path) and os.path.exists(arial_bold_path):
        try:
            pdfmetrics.registerFont(TTFont("ArialVN", arial_path))
            pdfmetrics.registerFont(TTFont("ArialVN-Bold", arial_bold_path))
            font_regular = "ArialVN"
            font_bold = "ArialVN-Bold"
            break
        except Exception:
            pass


def draw_instruction_page(c, page_w, page_h):
    """Vẽ trang 1: Hướng dẫn duy nhất về quy ước xoay đáp án và lưu ý."""
    # Khung viền trang
    c.setStrokeColorRGB(0.8, 0.85, 0.9)
    c.setLineWidth(1.5)
    c.roundRect(1 * cm, 1 * cm, page_w - 2 * cm, page_h - 2 * cm, 12)

    # Header Banner
    c.setFillColorRGB(0.1, 0.25, 0.5)
    c.roundRect(1.2 * cm, page_h - 3.2 * cm, page_w - 2.4 * cm, 1.9 * cm, 8, fill=1, stroke=0)

    c.setFillColorRGB(1, 1, 1)
    c.setFont(font_bold, 13)
    c.drawCentredString(page_w / 2, page_h - 2.1 * cm, "HỆ THỐNG TRẮC NGHIỆM THẺ GIẤY PICKBALL")

    c.setFont(font_bold, 10.5)
    c.setFillColorRGB(0.85, 0.92, 1.0)
    c.drawCentredString(page_w / 2, page_h - 2.8 * cm, "HƯỚNG DẪN SỬ DỤNG & QUY ƯỚC XOAY THẺ")

    # === PHẦN 1: QUY ƯỚC XOAY ĐÁP ÁN ===
    y = page_h - 4.2 * cm
    c.setFillColorRGB(0.12, 0.16, 0.25)
    c.setFont(font_bold, 11)
    c.drawString(1.5 * cm, y, "1. QUY ƯỚC CHỌN ĐÁP ÁN (A - B - C - D)")

    # Khung mô tả xoay thẻ
    box_y = y - 4.3 * cm
    c.setFillColorRGB(0.96, 0.98, 1.0)
    c.setStrokeColorRGB(0.75, 0.85, 0.95)
    c.setLineWidth(1)
    c.roundRect(1.5 * cm, box_y, page_w - 3 * cm, 4.0 * cm, 8, fill=1, stroke=1)

    # Text quy tắc
    c.setFont(font_regular, 9.5)
    c.setFillColorRGB(0.15, 0.2, 0.3)
    text_y = y - 0.7 * cm
    c.drawString(2.0 * cm, text_y, "Học sinh muốn chọn đáp án nào thì XOAY CẠNH CHỮ ĐÓ LÊN TRÊN:")

    rules = [
        ("• Cạnh chữ A hướng lên trên cùng", "= CHỌN ĐÁP ÁN A", (0.1, 0.4, 0.85)),
        ("• Cạnh chữ B hướng lên trên cùng", "= CHỌN ĐÁP ÁN B", (0.85, 0.5, 0.05)),
        ("• Cạnh chữ C hướng lên trên cùng", "= CHỌN ĐÁP ÁN C", (0.85, 0.15, 0.15)),
        ("• Cạnh chữ D hướng lên trên cùng", "= CHỌN ĐÁP ÁN D", (0.05, 0.65, 0.3)),
    ]

    for label, val, color in rules:
        text_y -= 0.65 * cm
        c.setFont(font_bold, 9.5)
        c.setFillColorRGB(*color)
        c.drawString(2.3 * cm, text_y, label)
        c.setFillColorRGB(0.1, 0.1, 0.1)
        c.drawString(8.2 * cm, text_y, val)

    # === PHẦN 2: LƯU Ý KHI GIƠ THẺ ===
    y2 = box_y - 0.8 * cm
    c.setFillColorRGB(0.12, 0.16, 0.25)
    c.setFont(font_bold, 11)
    c.drawString(1.5 * cm, y2, "2. LƯU Ý CHO HỌC SINH KHI TRẢ LỜI")

    box2_y = y2 - 3.7 * cm
    c.setFillColorRGB(0.99, 0.99, 0.99)
    c.setStrokeColorRGB(0.85, 0.85, 0.85)
    c.roundRect(1.5 * cm, box2_y, page_w - 3 * cm, 3.4 * cm, 8, fill=1, stroke=1)

    notes = [
        "1. Cầm thẻ ở mép ngoài cùng. TUYỆT ĐỐI KHÔNG để ngón tay che vào",
        "   phần ô vuông mã vạch đen ở giữa thẻ.",
        "2. Giơ thẻ thẳng đứng, phẳng, hướng mặt có mã về phía giáo viên.",
        "3. Nhìn lên màn hình máy chiếu, khi số thẻ của mình đổi sang màu xanh",
        "   (đã ghi nhận) thì có thể hạ thẻ xuống.",
    ]
    ny = y2 - 0.65 * cm
    c.setFont(font_regular, 8.8)
    c.setFillColorRGB(0.2, 0.2, 0.2)
    for n in notes:
        c.drawString(2.0 * cm, ny, n)
        ny -= 0.55 * cm

    # === PHẦN 3: HƯỚNG DẪN IN ẤN (CHO GIÁO VIÊN) ===
    y3 = box2_y - 0.8 * cm
    c.setFillColorRGB(0.12, 0.16, 0.25)
    c.setFont(font_bold, 11)
    c.drawString(1.5 * cm, y3, "3. HƯỚNG DẪN IN & BẢO QUẢN THẺ (CHO GIÁO VIÊN)")

    box3_y = 1.3 * cm
    box3_h = (y3 - 0.2 * cm) - box3_y
    c.setFillColorRGB(0.98, 0.99, 0.96)
    c.setStrokeColorRGB(0.7, 0.82, 0.65)
    c.roundRect(1.5 * cm, box3_y, page_w - 3 * cm, box3_h, 8, fill=1, stroke=1)

    print_guides = [
        "• File PDF này gồm 50 thẻ (từ trang 2 đến trang 51).",
        "• Khuyến nghị in trên giấy bìa A5 (14.8 x 21 cm) định lượng >= 160gsm.",
        "• Có thể ép nhựa plastic mờ (ép màng lụa) để chống lóa đèn và dùng nhiều năm.",
        "• Mỗi học sinh trong lớp được phát 1 mã thẻ cố định theo danh sách lớp.",
    ]
    py = y3 - 0.65 * cm
    c.setFont(font_regular, 8.5)
    c.setFillColorRGB(0.15, 0.35, 0.15)
    for pg in print_guides:
        c.drawString(2.0 * cm, py, pg)
        py -= 0.55 * cm

    c.showPage()


def generate_aruco_cards(count=50, dict_type=cv2.aruco.DICT_4X4_100):
    """Sinh PDF chứa trang hướng dẫn + các thẻ ArUco."""
    aruco_dict = cv2.aruco.getPredefinedDictionary(dict_type)
    pdf_path = os.path.join(OUTPUT_DIR, f'aruco_cards_{count}.pdf')
    c = canvas.Canvas(pdf_path, pagesize=A5)
    page_w, page_h = A5  # ~14.8cm x 21cm

    # 1. TRANG 1: Trang hướng dẫn duy nhất
    draw_instruction_page(c, page_w, page_h)

    # 2. CÁC TRANG TIẾP THEO: Mỗi trang 1 thẻ ArUco (không lặp lại trang hướng dẫn)
    for card_id in range(1, count + 1):
        # Sinh ArUco marker image
        marker_img = cv2.aruco.generateImageMarker(aruco_dict, card_id, 400)

        # Lưu tạm thành file PNG
        tmp_path = os.path.join(tempfile.gettempdir(), f'aruco_{card_id}.png')
        cv2.imwrite(tmp_path, marker_img)

        # Kích thước marker
        marker_size = 8 * cm
        x = (page_w - marker_size) / 2
        y = (page_h - marker_size) / 2

        # Vẽ viền trắng (quiet zone)
        c.setFillColorRGB(1, 1, 1)
        c.rect(x - 1.5 * cm, y - 1.5 * cm, marker_size + 3 * cm, marker_size + 3 * cm, fill=1)

        # Vẽ marker
        c.drawImage(tmp_path, x, y, marker_size, marker_size)

        # Thêm nhãn 4 hướng A/B/C/D
        # A: Hướng lên (cạnh trên)
        c.setFillColorRGB(0.7, 0.7, 0.7)
        c.setFont(font_bold, 24)
        center_x = page_w / 2
        c.drawCentredString(center_x, y + marker_size + 1.2 * cm, "A")
        c.drawCentredString(center_x, y - 1.8 * cm, "C")

        c.saveState()
        c.translate(x - 1.5 * cm, page_h / 2)
        c.rotate(90)
        c.drawCentredString(0, 0, "D")
        c.restoreState()

        c.saveState()
        c.translate(x + marker_size + 1.5 * cm, page_h / 2)
        c.rotate(-90)
        c.drawCentredString(0, 0, "B")
        c.restoreState()

        # Số thẻ ở góc dưới
        c.setFillColorRGB(0, 0, 0)
        c.setFont(font_bold, 16)
        c.drawString(1.2 * cm, 1.2 * cm, f"#{card_id:02d}")

        # Header nhỏ ở góc trên: "PICKBALL - THẺ TRẮC NGHIỆM"
        c.setFont(font_regular, 8.5)
        c.setFillColorRGB(0.4, 0.4, 0.4)
        c.drawRightString(page_w - 1.2 * cm, page_h - 1.2 * cm, f"Pickball Card #{card_id:02d}")

        c.showPage()

        # Cleanup
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    c.save()
    print(f"[OK] Generated PDF with 1 instruction page + {count} ArUco cards at: {pdf_path}")
    return pdf_path


if __name__ == '__main__':
    generate_aruco_cards()
