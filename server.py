import http.server
import socketserver
import json
import os
import urllib.request
import urllib.parse
import hashlib
import mimetypes

PORT = 8000
DB_FILE = 'db.json'
UPLOADS_DIR = 'uploads'

# Create uploads directory if it doesn't exist
os.makedirs(UPLOADS_DIR, exist_ok=True)

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        if self.path == '/api/data':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            if os.path.exists(DB_FILE):
                with open(DB_FILE, 'r', encoding='utf-8') as f:
                    self.wfile.write(f.read().encode('utf-8'))
            else:
                self.wfile.write(b'{}')
            return

        if self.path == '/api/cleanup-images':
            try:
                # 1. Collect all image URLs referenced in the database
                referenced = set()
                if os.path.exists(DB_FILE):
                    with open(DB_FILE, 'r', encoding='utf-8') as f:
                        db = json.load(f)
                    for trip in db.get('trips', []):
                        # Trip cover thumbnail
                        thumb = trip.get('thumb', '')
                        if thumb.startswith('/uploads/'):
                            referenced.add(thumb.lstrip('/'))
                        for day in trip.get('days', []):
                            for stop in day.get('stops', []):
                                photo = stop.get('photo', '')
                                if photo.startswith('/uploads/'):
                                    referenced.add(photo.lstrip('/'))

                # 2. Scan the uploads directory
                deleted = []
                if os.path.isdir(UPLOADS_DIR):
                    for fname in os.listdir(UPLOADS_DIR):
                        fpath = os.path.join(UPLOADS_DIR, fname)
                        if not os.path.isfile(fpath):
                            continue
                        rel = f'uploads/{fname}'
                        if rel not in referenced:
                            os.remove(fpath)
                            deleted.append(fname)
                            print(f'[cleanup-images] Removed orphan: {fname}')

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'status': 'success',
                    'deleted_count': len(deleted),
                    'deleted': deleted
                }).encode('utf-8'))
            except Exception as e:
                print(f'[cleanup-images] Error: {e}')
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'error', 'message': str(e)}).encode('utf-8'))
            return

        # Fallback to normal file serving
        return super().do_GET()

    def do_POST(self):
        if self.path == '/api/save':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                json_data = json.loads(post_data.decode('utf-8'))
                with open(DB_FILE, 'w', encoding='utf-8') as f:
                    json.dump(json_data, f, ensure_ascii=False, indent=4)
                    
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
            return

        if self.path == '/api/upload-image':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)

            try:
                body = json.loads(post_data.decode('utf-8'))
                remote_url = body.get('url', '')

                if not remote_url:
                    raise ValueError("Missing 'url' in request body")

                # Use hash of URL as filename to avoid duplicates
                url_hash = hashlib.md5(remote_url.encode()).hexdigest()

                # Try to guess extension from URL or Content-Type
                parsed = urllib.parse.urlparse(remote_url)
                ext = os.path.splitext(parsed.path)[1]
                if ext.lower() not in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
                    ext = '.jpg'  # default

                filename = f"{url_hash}{ext}"
                local_path = os.path.join(UPLOADS_DIR, filename)

                # Only download if not already cached
                if not os.path.exists(local_path):
                    req = urllib.request.Request(
                        remote_url,
                        headers={'User-Agent': 'Mozilla/5.0'}
                    )
                    with urllib.request.urlopen(req, timeout=10) as response:
                        img_data = response.read()
                    with open(local_path, 'wb') as f:
                        f.write(img_data)
                    print(f"[upload-image] Downloaded: {filename}")
                else:
                    print(f"[upload-image] Cache hit: {filename}")

                local_url = f"/uploads/{filename}"

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "localUrl": local_url}).encode('utf-8'))

            except Exception as e:
                print(f"[upload-image] Error: {e}")
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
            return

        if self.path == '/api/delete-image':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                body = json.loads(post_data.decode('utf-8'))
                urls = body.get('urls', [])
                if isinstance(urls, str):
                    urls = [urls]
                deleted = []
                for local_url in urls:
                    # Only allow deleting files inside /uploads/
                    if not local_url.startswith('/uploads/'):
                        continue
                    filename = local_url.lstrip('/')          # "uploads/xxx.jpg"
                    safe_path = os.path.normpath(filename)
                    if not safe_path.startswith('uploads'):
                        continue
                    if os.path.exists(safe_path):
                        os.remove(safe_path)
                        deleted.append(local_url)
                        print(f"[delete-image] Removed: {safe_path}")
                    else:
                        print(f"[delete-image] Not found (skip): {safe_path}")

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "deleted": deleted}).encode('utf-8'))
            except Exception as e:
                print(f"[delete-image] Error: {e}")
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

# Allow fast restart of the server by setting allow_reuse_address
socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
    print(f"Serving at port {PORT}")
    print(f"API endpoints available:")
    print(f" - GET  /api/data")
    print(f" - POST /api/save")
    print(f" - POST /api/upload-image  (local image caching)")
    print(f" - POST /api/delete-image  (remove cached images)")
    print(f" - Static files in /uploads/ served automatically")
    httpd.serve_forever()
