"""Owner-only local credential entry for migrating private media; never prints secrets."""
import getpass
import json
import os
from pathlib import Path
import re
import sys

if not sys.stdin.isatty():
    raise SystemExit('เปิดคำสั่งนี้ใน Terminal ของคุณเองเท่านั้น')
key = getpass.getpass('Supabase Secret key จาก Settings → API Keys (ค่าจะไม่แสดงบนหน้าจอ): ').strip()
if not key.startswith('sb_secret_'):
    raise SystemExit('ใช้ Secret key รุ่นใหม่ที่ขึ้นต้น sb_secret_ เท่านั้น ยังไม่ได้บันทึก')
path = Path(__file__).resolve().parents[2] / '.env.local'
existing = path.read_text()
existing = re.sub(r'^SUPABASE_MIGRATION_SECRET_KEY=.*\n?', '', existing, flags=re.M)
temporary = path.with_suffix('.local.tmp')
fd = os.open(temporary, os.O_CREAT | os.O_TRUNC | os.O_WRONLY, 0o600)
with os.fdopen(fd,'w') as output:
    output.write(existing.rstrip()+'\nSUPABASE_MIGRATION_SECRET_KEY='+json.dumps(key)+'\n')
os.replace(temporary,path)
print('บันทึกคีย์สำหรับย้ายสื่อแล้ว ไม่ต้องส่งคีย์มาในแชท')
