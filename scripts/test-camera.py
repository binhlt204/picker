"""
Kiểm tra và quét thẻ ArUco qua Webcam máy tính, đồng bộ trực tiếp với Server LB HOUSE.
Chạy: python scripts/test-camera.py
Cần đăng nhập: đặt biến môi trường LBHOUSE_TOKEN = token đăng nhập (lấy trong localStorage "lbhouse_token" của trình duyệt)
Nhấn 'q' để thoát.
"""

import cv2
import numpy as np
import urllib.request
import json
import time
import os

SERVER_URL = "http://localhost:3001"
AUTH_HEADERS = {"Authorization": "Bearer " + os.environ.get("LBHOUSE_TOKEN", "")}

def get_active_session():
    try:
        req = urllib.request.Request(f"{SERVER_URL}/api/sessions", headers=AUTH_HEADERS)
        with urllib.request.urlopen(req, timeout=2) as resp:
            sessions = json.loads(resp.read().decode('utf-8'))
            for s in sessions:
                if s.get("status") == "ACTIVE":
                    return s
    except Exception as e:
        pass
    return None

def submit_answer(session_id, card_id, answer):
    try:
        data = json.dumps({"cardId": card_id, "answer": answer}).encode('utf-8')
        req = urllib.request.Request(
            f"{SERVER_URL}/api/sessions/{session_id}/submit-card",
            data=data,
            headers={"Content-Type": "application/json", **AUTH_HEADERS}
        )
        with urllib.request.urlopen(req, timeout=1) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception:
        return None

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

    active_session = get_active_session()
    last_session_check = time.time()
    submitted_history = {} # card_id -> (answer, timestamp)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Kiem tra phien thi dinh ky moi 5 giay
        now = time.time()
        if now - last_session_check > 5:
            active_session = get_active_session()
            last_session_check = now

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        corners, ids, rejected = detector.detectMarkers(gray)

        if ids is not None and len(ids) > 0:
            cv2.aruco.drawDetectedMarkers(frame, corners, ids)

            for i in range(len(ids)):
                card_id = int(np.ravel(ids[i])[0])
                corner = corners[i].reshape(-1, 2)

                p0, p1 = corner[0], corner[1]
                dx, dy = p1[0] - p0[0], p1[1] - p0[1]
                angle = np.degrees(np.arctan2(dy, dx))

                # Quy ước góc xoay đồng bộ:
                # A: [-45°, 45°]
                # B: [-135°, -45°]
                # C: [>135° hoặc <= -135°]
                # D: [45°, 135°]
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

                # Tu dong nop bai ve Server neu co phien thi dang chay
                if active_session:
                    last_sub = submitted_history.get(card_id)
                    if not last_sub or last_sub[0] != answer or (now - last_sub[1] > 3):
                        res = submit_answer(active_session["id"], card_id, answer)
                        if res and res.get("success"):
                            submitted_history[card_id] = (answer, now)

                # Ve nhan len video
                is_sent = card_id in submitted_history and (now - submitted_history[card_id][1] < 3)
                status_icon = "[V]" if is_sent else ""
                text = f"#{card_id} -> {answer} {status_icon} ({int(angle)}deg)"
                cv2.rectangle(frame, (center[0] - 90, center[1] - 32), (center[0] + 90, center[1] + 12), (15, 23, 42), -1)
                cv2.rectangle(frame, (center[0] - 90, center[1] - 32), (center[0] + 90, center[1] + 12), badge_color, 2)
                cv2.putText(frame, text, (center[0] - 84, center[1] - 6),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.52, (255, 255, 255), 2)

        # Thanh thong tin tren cung
        h, w = frame.shape[:2]
        cv2.rectangle(frame, (0, 0), (w, 38), (15, 23, 42), -1)
        count_detected = len(ids) if ids is not None else 0
        session_text = f"Phien: {active_session['classroom_name']}" if active_session else "Chua co phien ACTIVE"
        cv2.putText(frame, f"LB HOUSE Live Sync | {session_text} | Da quet: {count_detected} | Nhan 'q' thoat",
                    (12, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (255, 255, 255), 1)

        cv2.imshow("LB HOUSE ArUco Live Sync", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    test_camera()
