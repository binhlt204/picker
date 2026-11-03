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
        print("❌ Không mở được camera!")
        return

    print("📷 Camera đang hoạt động. Giơ thẻ ArUco lên để nhận diện. Nhấn 'q' để thoát.")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        corners, ids, rejected = detector.detectMarkers(gray)

        if ids is not None:
            cv2.aruco.drawDetectedMarkers(frame, corners, ids)

            for i in range(len(ids)):
                card_id = int(ids[i][0])
                corner = corners[i][0]

                # Vector cạnh trên của thẻ (từ p0 đến p1)
                p0, p1 = corner[0], corner[1]
                dx, dy = p1[0] - p0[0], p1[1] - p0[1]

                # Tính góc xoay
                angle = np.degrees(np.arctan2(dy, dx))

                if -45 <= angle <= 45:
                    answer = "A"
                elif 45 < angle <= 135:
                    answer = "B"
                elif angle > 135 or angle <= -135:
                    answer = "C"
                else:
                    answer = "D"

                center = np.mean(corner, axis=0).astype(int)
                text = f"#{card_id} -> {answer}"
                cv2.putText(frame, text, (center[0] - 30, center[1] - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

        cv2.imshow("Pickball ArUco Scanner Test", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    test_camera()
