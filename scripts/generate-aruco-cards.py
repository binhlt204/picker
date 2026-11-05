"""
Sinh PDF thẻ trắc nghiệm ArUco (DICT_4X4_100) THEO DANH SÁCH LỚP.
- Trang 1: hướng dẫn quy ước xoay thẻ.
- Các trang sau: mỗi học sinh 1 thẻ, mã ArUco = số thẻ (card_id) của học sinh.

Bố cục thẻ:
  • Mã ArUco lớn ở giữa.
  • Chữ A (trên), B (phải), C (dưới), D (trái): mỗi chữ quay sao cho đọc xuôi khi cạnh đó hướng lên.
  • Số thẻ ở 4 góc, góc nào cũng đọc xuôi theo hướng tương ứng.
  • Chữ thương hiệu "pickerball" nhỏ ở góc trên bên trái.
  • Họ tên học sinh và tên lớp in nhỏ dọc theo cạnh phải.

Chạy:
  python scripts/generate-aruco-cards.py --input lop.json --output the_lop.pdf

File JSON đầu vào:
  { "classroom": "10A1", "students": [ { "card_id": 1, "full_name": "Nguyễn Văn A" }, ... ] }
"""

import argparse
import json
import os
import sys
import tempfile

import cv2
from reportlab.lib.pagesizes import A5
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

BRAND_TEXT = "pickerball"

# ===== Font hỗ trợ tiếng Việt =====
font_regular = "Helvetica"
font_bold = "Helvetica-Bold"
for font_dir in ["C:/Windows/Fonts", "/usr/share/fonts/truetype", "/usr/share/fonts/truetype/msttcorefonts", "/Library/Fonts"]:
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

GREY = (0.55, 0.6, 0.65)      # màu chữ A/B/C/D, số thẻ
LIGHT_GREY = (0.65, 0.68, 0.72)


def draw_instruction_page(c, page_w, page_h, classroom_name, total):
    """Trang 1: hướng dẫn quy ước xoay đáp án và lưu ý."""
    c.setStrokeColorRGB(0.8, 0.85, 0.9)
    c.setLineWidth(1.5)
    c.roundRect(1 * cm, 1 * cm, page_w - 2 * cm, page_h - 2 * cm, 12)

    c.setFillColorRGB(0.1, 0.25, 0.5)
    c.roundRect(1.2 * cm, page_h - 3.2 * cm, page_w - 2.4 * cm, 1.9 * cm, 8, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont(font_bold, 13)
    c.drawCentredString(page_w / 2, page_h - 2.1 * cm, f"THẺ TRẮC NGHIỆM {BRAND_TEXT.upper()}")
    c.setFont(font_bold, 10.5)
    c.setFillColorRGB(0.85, 0.92, 1.0)
    c.drawCentredString(page_w / 2, page_h - 2.8 * cm, f"Lớp {classroom_name} • {total} học sinh")

    # 1. Quy ước
    y = page_h - 4.2 * cm
    c.setFillColorRGB(0.12, 0.16, 0.25)
    c.setFont(font_bold, 11)
    c.drawString(1.5 * cm, y, "1. QUY ƯỚC CHỌN ĐÁP ÁN (A - B - C - D)")

    box_y = y - 4.3 * cm
    c.setFillColorRGB(0.96, 0.98, 1.0)
    c.setStrokeColorRGB(0.75, 0.85, 0.95)
    c.setLineWidth(1)
    c.roundRect(1.5 * cm, box_y, page_w - 3 * cm, 4.0 * cm, 8, fill=1, stroke=1)

    c.setFont(font_regular, 9.5)
    c.setFillColorRGB(0.15, 0.2, 0.3)
    text_y = y - 0.7 * cm
    c.drawString(2.0 * cm, text_y, "Muốn chọn đáp án nào thì XOAY CHỮ ĐÓ LÊN CẠNH TRÊN CÙNG:")
    for letter in "ABCD":
        text_y -= 0.65 * cm
        c.setFont(font_bold, 9.5)
        c.setFillColorRGB(0.15, 0.2, 0.3)
        c.drawString(2.3 * cm, text_y, f"• Chữ {letter} ở cạnh trên cùng")
        c.setFillColorRGB(0.1, 0.1, 0.1)
        c.drawString(8.2 * cm, text_y, f"= CHỌN ĐÁP ÁN {letter}")

    # 2. Lưu ý
    y2 = box_y - 0.8 * cm
    c.setFillColorRGB(0.12, 0.16, 0.25)
    c.setFont(font_bold, 11)
    c.drawString(1.5 * cm, y2, "2. LƯU Ý KHI GIƠ THẺ")

    box2_y = y2 - 3.7 * cm
    c.setFillColorRGB(0.99, 0.99, 0.99)
    c.setStrokeColorRGB(0.85, 0.85, 0.85)
    c.roundRect(1.5 * cm, box2_y, page_w - 3 * cm, 3.4 * cm, 8, fill=1, stroke=1)
    notes = [
        "1. Cầm thẻ ở mép ngoài, KHÔNG để ngón tay che vào ô mã màu đen.",
        "2. Giơ thẻ thẳng, phẳng, mặt có mã hướng về phía giáo viên.",
        "3. Khi số thẻ của mình trên máy chiếu chuyển sang màu xanh",
        "   (đã ghi nhận) thì có thể hạ thẻ xuống.",
    ]
    ny = y2 - 0.65 * cm
    c.setFont(font_regular, 8.8)
    c.setFillColorRGB(0.2, 0.2, 0.2)
    for n in notes:
        c.drawString(2.0 * cm, ny, n)
        ny -= 0.55 * cm

    # 3. In ấn
    y3 = box2_y - 0.8 * cm
    c.setFillColorRGB(0.12, 0.16, 0.25)
    c.setFont(font_bold, 11)
    c.drawString(1.5 * cm, y3, "3. IN & BẢO QUẢN THẺ (CHO GIÁO VIÊN)")
    box3_y = 1.3 * cm
    box3_h = (y3 - 0.2 * cm) - box3_y
    c.setFillColorRGB(0.98, 0.99, 0.96)
    c.setStrokeColorRGB(0.7, 0.82, 0.65)
    c.roundRect(1.5 * cm, box3_y, page_w - 3 * cm, box3_h, 8, fill=1, stroke=1)
    guides = [
        f"• File gồm {total} thẻ của lớp {classroom_name} (từ trang 2), mỗi em 1 thẻ.",
        "• Trên mỗi thẻ có in họ tên học sinh để phát đúng người.",
        "• Nên in giấy bìa A5 (>= 160gsm), ép plastic mờ để chống lóa.",
        "• Khi lớp thay đổi danh sách, tải lại file thẻ từ trang Lớp học.",
    ]
    py = y3 - 0.65 * cm
    c.setFont(font_regular, 8.5)
    c.setFillColorRGB(0.15, 0.35, 0.15)
    for g in guides:
        c.drawString(2.0 * cm, py, g)
        py -= 0.55 * cm

    c.showPage()


def draw_rotated_text(c, x, y, angle, text, font, size, color, align="center"):
    c.saveState()
    c.translate(x, y)
    c.rotate(angle)
    c.setFont(font, size)
    c.setFillColorRGB(*color)
    if align == "center":
        c.drawCentredString(0, 0, text)
    elif align == "left":
        c.drawString(0, 0, text)
    else:
        c.drawRightString(0, 0, text)
    c.restoreState()


def draw_card(c, page_w, page_h, aruco_dict, card_id, full_name, classroom_name):
    """Vẽ 1 thẻ theo bố cục: mã lớn ở giữa, chữ A-D ở 4 cạnh, số thẻ ở 4 góc."""
    marker_size = 10.5 * cm
    mx = (page_w - marker_size) / 2
    my = (page_h - marker_size) / 2
    cx, cy = page_w / 2, page_h / 2
    gap = 0.75 * cm  # khoảng cách từ mép mã tới chữ (vùng trắng quiet zone)

    # Mã ArUco (generateImageMarker đã có viền đen 1 bit; vùng trắng xung quanh là nền giấy)
    marker_img = cv2.aruco.generateImageMarker(aruco_dict, card_id, 600)
    fd, tmp_path = tempfile.mkstemp(suffix=".png")
    os.close(fd)
    try:
        cv2.imwrite(tmp_path, marker_img)
        c.drawImage(tmp_path, mx, my, marker_size, marker_size)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    # Chữ đáp án ở giữa mỗi cạnh — xoay để đọc xuôi khi cạnh đó hướng lên
    letter_size = 18
    draw_rotated_text(c, cx, my + marker_size + gap, 0, "A", font_regular, letter_size, GREY)
    draw_rotated_text(c, mx + marker_size + gap, cy, -90, "B", font_regular, letter_size, GREY)
    draw_rotated_text(c, cx, my - gap, 180, "C", font_regular, letter_size, GREY)
    draw_rotated_text(c, mx - gap, cy, 90, "D", font_regular, letter_size, GREY)

    # Số thẻ ở 4 góc (góc trên-phải theo hướng đọc của từng cạnh)
    num = str(card_id)
    num_size = 16
    off = 0.55 * cm
    draw_rotated_text(c, mx + marker_size, my + marker_size + off, 0, num, font_regular, num_size, GREY)       # A lên
    draw_rotated_text(c, mx + marker_size + off, my, -90, num, font_regular, num_size, GREY)                  # B lên
    draw_rotated_text(c, mx, my - off, 180, num, font_regular, num_size, GREY)                                # C lên
    draw_rotated_text(c, mx - off, my + marker_size, 90, num, font_regular, num_size, GREY)                   # D lên

    # Thương hiệu: nhỏ ở góc trên bên trái
    c.setFont(font_regular, 7.5)
    c.setFillColorRGB(*LIGHT_GREY)
    c.drawString(mx, my + marker_size + 0.25 * cm, BRAND_TEXT)

    # Họ tên + lớp: in nhỏ dọc theo cạnh phải, phía trên (giống vị trí dòng phiên bản trên thẻ mẫu)
    label = f"{full_name} • {classroom_name}" if classroom_name else full_name
    draw_rotated_text(c, mx + marker_size + 0.3 * cm, my + marker_size - 0.1 * cm, -90,
                      label, font_regular, 7, LIGHT_GREY, align="left")

    c.showPage()


def generate_class_cards(classroom_name, students, output_path):
    aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_100)
    students = sorted(students, key=lambda s: int(s["card_id"]))

    c = canvas.Canvas(output_path, pagesize=A5)
    c.setTitle(f"The trac nghiem - {classroom_name}")
    page_w, page_h = A5

    draw_instruction_page(c, page_w, page_h, classroom_name, len(students))
    for s in students:
        card_id = int(s["card_id"])
        if not (0 <= card_id < 100):
            raise ValueError(f"Số thẻ {card_id} nằm ngoài phạm vi DICT_4X4_100 (0-99)")
        draw_card(c, page_w, page_h, aruco_dict, card_id, str(s.get("full_name", "")), classroom_name)

    c.save()
    return output_path


def main():
    parser = argparse.ArgumentParser(description="Sinh PDF thẻ ArUco theo danh sách lớp")
    parser.add_argument("--input", required=True, help="File JSON danh sách lớp, hoặc '-' để đọc từ stdin")
    parser.add_argument("--output", required=True, help="Đường dẫn file PDF xuất ra")
    args = parser.parse_args()

    if args.input == "-":
        data = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    else:
        with open(args.input, encoding="utf-8") as f:
            data = json.load(f)

    students = data.get("students") or []
    if not students:
        print("Classroom has no students", file=sys.stderr)
        sys.exit(2)

    generate_class_cards(str(data.get("classroom", "")), students, args.output)
    print(f"[OK] {len(students)} cards -> {args.output}")


if __name__ == "__main__":
    main()
