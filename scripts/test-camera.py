"""
Kiểm tra khả năng nhận diện thẻ ArUco qua Webcam máy tính.
Chạy: python scripts/test-camera.py
Ấn phím 'q' để thoát.
"""

import cv2
import numpy as np

def test_camera():
    aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_100)
    parameters = cv2.aruco.DetectorParameters()
    detector = cv2.aruco.ArucoDetector(aruco_dict, parameters)

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Không mở được camera! Vui lòng kiểm tra webcam máy tính.")
        return

    print("📷 Camera đang hoạt động. Giơ thẻ ArUco lên để nhận diện. Nhấn 'q' để thoát.")

    color_map = {
        "A": (246, 130, 59),   # Blue (BGR)
        "B": (11, 158, 245),   # Amber/Orange (BGR)
        "C": (68, 68, 239),    # Red (BGR)
        "D": (94, 197, 34),    # Emerald/Green (BGR)
    }

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        corners, ids, rejected = detector.detectMarkers(gray)

        if ids is not None and len(ids) > 0:
            cv2.aruco.drawDetectedMarkers(frame, corners, ids)

            for i in range(len(ids)):
                # Xử lý tương thích cho cả OpenCV 4.x (2D array) và OpenCV 5.x (1D scalar array)
                card_id = int(np.ravel(ids[i])[0])
                corner = corners[i].reshape(-1, 2)  # Luôn có kích thước (4, 2)

                # Vector cạnh trên của thẻ (từ p0 đến p1)
                p0, p1 = corner[0], corner[1]
                dx, dy = p1[0] - p0[0], p1[1] - p0[1]

                # Tính góc xoay (radian -> degree)
                angle = np.degrees(np.arctan2(dy, dx))

                # Quy ước đáp án theo hướng cạnh trên (trục Y hướng xuống trong OpenCV)
                # A: Cạnh trên A hướng lên       -> dx > 0, dy ~ 0  -> [-45°, 45°]
                # B: Cạnh phải B hướng lên       -> dx ~ 0, dy < 0  -> [-135°, -45°]
                # C: Cạnh dưới C hướng lên (lộn ngược) -> dx < 0, dy ~ 0 -> [>135° hoặc <= -135°]
                # D: Cạnh trái D hướng lên       -> dx ~ 0, dy > 0  -> [45°, 135°]
                if -45 <= angle <= 45:
                    answer = "A"
                elif -135 < angle < -45:
                    answer = "B"
                elif angle > 135 or angle <= -135:
                    answer = "C"
                else:
                    answer = "D"

                center = np.mean(corner, axis=0).astype(int)
                badge_color = color_map.get(answer, (0, 255, 0))

                # Vẽ nhãn đáp án nổi bật kèm góc xoay độ
                text = f"#{card_id} -> {answer} ({int(angle)}deg)"
                cv2.rectangle(frame, (center[0] - 80, center[1] - 32), (center[0] + 80, center[1] + 12), (15, 23, 42), -1)
                cv2.rectangle(frame, (center[0] - 80, center[1] - 32), (center[0] + 80, center[1] + 12), badge_color, 2)
                cv2.putText(frame, text, (center[0] - 74, center[1] - 6),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

        # Header hướng dẫn trên camera
        h, w = frame.shape[:2]
        cv2.rectangle(frame, (0, 0), (w, 36), (15, 23, 42), -1)
        count_detected = len(ids) if ids is not None else 0
        cv2.putText(frame, f"Pickball Scanner Test | Da phat hien: {count_detected} the | Nhan 'q' de thoat",
                    (12, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)

        cv2.imshow("Pickball ArUco Scanner Test", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    test_camera()
