"""
Sinh bộ 50 thẻ ArUco DICT_4X4_50 ra file PDF sẵn sàng in.
Chạy: python scripts/generate-aruco-cards.py

Output: scripts/output/aruco_cards_50.pdf
"""

import cv2
import numpy as np
from reportlab.lib.pagesizes import A5
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
import os
import tempfile

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'output')
os.makedirs(OUTPUT_DIR, exist_ok=True)

def generate_aruco_cards(count=50, dict_type=cv2.aruco.DICT_4X4_100):
    """Sinh PDF chứa các thẻ ArUco."""
    aruco_dict = cv2.aruco.getPredefinedDictionary(dict_type)
    pdf_path = os.path.join(OUTPUT_DIR, f'aruco_cards_{count}.pdf')
    c = canvas.Canvas(pdf_path, pagesize=A5)
    page_w, page_h = A5  # ~14.8cm x 21cm

    for card_id in range(1, count + 1):
        # === MẶT TRƯỚC ===
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
        c.rect(x - 1.5*cm, y - 1.5*cm, marker_size + 3*cm, marker_size + 3*cm, fill=1)

        # Vẽ marker
        c.drawImage(tmp_path, x, y, marker_size, marker_size)

        # Thêm nhãn 4 hướng A/B/C/D
        # Lưu ý: Quy ước xoay thẻ
        # A: Hướng lên (cạnh trên)
        c.setFillColorRGB(0.7, 0.7, 0.7)
        c.setFont("Helvetica-Bold", 24)
        center_x = page_w / 2
        c.drawCentredString(center_x, y + marker_size + 1.2*cm, "A")
        c.drawCentredString(center_x, y - 1.8*cm, "C")

        c.saveState()
        c.translate(x - 1.5*cm, page_h / 2)
        c.rotate(90)
        c.drawCentredString(0, 0, "D")
        c.restoreState()

        c.saveState()
        c.translate(x + marker_size + 1.5*cm, page_h / 2)
        c.rotate(-90)
        c.drawCentredString(0, 0, "B")
        c.restoreState()

        # Số thẻ ở góc
        c.setFillColorRGB(0, 0, 0)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(1*cm, 1*cm, f"#{card_id:02d}")

        c.showPage()

        # === MẶT SAU ===
        c.setFont("Helvetica-Bold", 36)
        c.drawCentredString(page_w / 2, page_h / 2 + 2*cm, f"The #{card_id:02d}")

        c.setFont("Helvetica", 12)
        guide_text = [
            "Huong dan xoay the:",
            "Chu A huong len = Dap an A",
            "Chu B huong len = Dap an B",
            "Chu C huong len = Dap an C",
            "Chu D huong len = Dap an D",
        ]
        y_text = page_h / 2 - 1*cm
        for line in guide_text:
            c.drawCentredString(page_w / 2, y_text, line)
            y_text -= 0.6*cm

        c.showPage()

        # Cleanup
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    c.save()
    print(f"[OK] Generated {count} ArUco cards at {pdf_path}")
    return pdf_path

if __name__ == '__main__':
    generate_aruco_cards()
