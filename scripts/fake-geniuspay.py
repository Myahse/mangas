"""Minimal stand-in for the GeniusPay merchant API, for local tests of coin purchases.

    python scripts/fake-geniuspay.py [port]          (default 8099)

Point the backend at it with GENIUSPAY_BASE_URL=http://localhost:8099/api/v1/merchant and any
GENIUSPAY_API_KEY / GENIUSPAY_API_SECRET. Implements POST /payments and GET /payments/{reference};
POST /_test/payments/{reference}/status {"status": "completed", "amount": 500} changes a payment.
"""
import json
import sys
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PREFIX = "/api/v1/merchant"
payments = {}


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body):
        raw = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _body(self):
        if "chunked" in (self.headers.get("Transfer-Encoding") or "").lower():
            raw = b""
            while True:
                size = int(self.rfile.readline().strip().split(b";")[0], 16)
                if size == 0:
                    self.rfile.readline()
                    break
                raw += self.rfile.read(size)
                self.rfile.readline()
        else:
            raw = self.rfile.read(int(self.headers.get("Content-Length") or 0))
        return json.loads(raw or b"{}")

    def _authorized(self):
        if self.headers.get("X-API-Key") and self.headers.get("X-API-Secret"):
            return True
        self._send(401, {"success": False, "error": {"code": "UNAUTHORIZED", "message": "missing keys"}})
        return False

    def do_POST(self):
        if self.path.startswith("/_test/payments/"):
            ref = self.path.split("/")[3]
            if ref not in payments:
                return self._send(404, {"success": False})
            payments[ref].update(self._body())
            return self._send(200, {"success": True, "data": payments[ref]})
        if self.path != PREFIX + "/payments":
            return self._send(404, {"success": False})
        if not self._authorized():
            return
        req = self._body()
        if (req.get("amount") or 0) < 200:
            return self._send(422, {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "min 200"}})
        ref = "MTX-" + uuid.uuid4().hex[:10].upper()
        payments[ref] = {
            "id": len(payments) + 1,
            "reference": ref,
            "amount": req["amount"],
            "currency": req.get("currency", "XOF"),
            "status": "pending",
            "checkout_url": "http://localhost:8099/checkout/" + ref,
            "payment_url": "http://localhost:8099/checkout/" + ref,
            "metadata": req.get("metadata"),
            "success_url": req.get("success_url"),
            "error_url": req.get("error_url"),
            "customer": req.get("customer"),
            "environment": "sandbox",
        }
        self._send(201, {"success": True, "data": payments[ref]})

    def do_GET(self):
        if self.path.startswith(PREFIX + "/payments/"):
            if not self._authorized():
                return
            ref = self.path.rsplit("/", 1)[1]
            if ref not in payments:
                return self._send(404, {"success": False, "error": {"code": "TRANSACTION_NOT_FOUND", "message": "not found"}})
            return self._send(200, {"success": True, "data": payments[ref]})
        self._send(404, {"success": False})

    def log_message(self, fmt, *args):
        sys.stderr.write("fake-geniuspay: " + (fmt % args) + "\n")


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8099
    print(f"fake GeniusPay on http://localhost:{port}{PREFIX}", flush=True)
    ThreadingHTTPServer.request_queue_size = 128  # concurrent webhook/poll tests
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
