#!/usr/bin/env bash
# Diagnosa favicon: membandingkan isi file di 4 tempat.
# Jalankan di server. Tidak mengubah apa pun.
set -u
cd /home/hub/Armada-v1.0

echo "=== 1. Ukuran &md5 di WORKING TREE (yang di-commit ke image) ==="
ls -l public/favicon.svg public/faviconold.svg 2>/dev/null
md5sum public/favicon.svg 2>/dev/null
head -c 90 public/favicon.svg; echo

echo
echo "=== 2. UKur di DALAM container frontend (dev, port 5174) ==="
docker compose exec -T frontend sh -c 'ls -l public/favicon.svg; md5sum public/favicon.svg; head -c 90 public/favicon.svg' 2>&1 | tail -5

echo
echo "=== 3. Ukur di DALAM container frontend-preview (production, port 8081) ==="
docker compose --profile preview exec -T frontend-preview sh -c 'ls -l /usr/share/nginx/html/favicon.svg; md5sum /usr/share/nginx/html/favicon.svg' 2>&1 | tail -4

echo
echo "=== 4. Yang benar-benar DI SAJI HTTP ==="
for p in 5174 8081; do
  echo "--- port $p ---"
  curl -sI "http://localhost:$p/favicon.svg" | grep -iE '^(HTTP|content-type|content-length|etag|cache-control)'
  curl -s "http://localhost:$p/favicon.svg" | head -c 90; echo
done

echo
echo "=== 5. Container yang sedang jalan ==="
docker compose ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"
