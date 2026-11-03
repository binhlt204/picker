import sys
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
import cv2
import numpy as np

# Khoi tao bo phat hien ArUco DICT_4X4_100
aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_100)
parameters = cv2.aruco.DetectorParameters()
detector = cv2.aruco.ArucoDetector(aruco_dict, parameters)

def decode_markers(image_bytes):
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return []

    corners, ids, rejected = detector.detectMarkers(img)
    results = []

    if ids is not None and len(ids) > 0:
        for i in range(len(ids)):
            card_id = int(np.ravel(ids[i])[0])
            corner = corners[i].reshape(-1, 2)

            p0, p1 = corner[0], corner[1]
            dx, dy = p1[0] - p0[0], p1[1] - p0[1]
            angle = float(np.degrees(np.arctan2(dy, dx)))

            # Quy uoc goc xoay chuan cho ArUco 4x4
            if -45 <= angle <= 45:
                answer = "A"
            elif -135 < angle < -45:
                answer = "B"
            elif angle > 135 or angle <= -135:
                answer = "C"
            else:
                answer = "D"

            results.append({
                "cardId": card_id,
                "answer": answer,
                "angle": round(angle, 1)
            })

    return results

class DetectorHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status":"ready"}')
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/detect":
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length == 0:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'{"error":"Empty image"}')
                return

            body = self.rfile.read(content_length)
            results = decode_markers(body)

            response_data = json.dumps({"success": True, "results": results}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response_data)))
            self.end_headers()
            self.wfile.write(response_data)
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Tat log HTTP thong thuong de khong lam roi console
        pass

def run():
    port = 5001
    server = HTTPServer(("127.0.0.1", port), DetectorHandler)
    print(f"[*] ArUco Detector Microservice listening on http://127.0.0.1:{port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == "__main__":
    run()
