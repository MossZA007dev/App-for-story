"""Run in your own terminal; credentials are never echoed or passed as arguments."""
import base64
import getpass
import json
import os
from pathlib import Path
import re
import secrets
import sys
from urllib.parse import quote, urlsplit

ROOT = Path(__file__).resolve().parents[2]


def prepare_values(project_url, key, database_url, password):
    project_url = project_url.strip().rstrip('/')
    parsed = urlsplit(project_url)
    if parsed.scheme != 'https' or not re.fullmatch(r'[a-z0-9-]+\.supabase\.co', parsed.netloc) or parsed.path:
        raise ValueError('Project URL ไม่ถูกต้อง ใช้ https://ชื่อโปรเจกต์.supabase.co')
    if not key.strip().startswith(('sb_publishable_', 'eyJ')):
        raise ValueError('ใช้ Publishable key หรือ legacy anon key ไม่ใช่ Secret key')
    database_url = database_url.strip()
    if '[YOUR-PASSWORD]' in database_url:
        database_url = database_url.replace('[YOUR-PASSWORD]', quote(password, safe=''))
    if '[YOUR-DATABASE-PASSWORD]' in database_url:
        database_url = database_url.replace('[YOUR-DATABASE-PASSWORD]', quote(password, safe=''))
    connection = urlsplit(database_url)
    if connection.scheme not in ('postgres', 'postgresql') or not connection.hostname or not connection.password or '[' in database_url:
        raise ValueError('Connection string ไม่ครบ ให้คัดลอกจาก Connect → Transaction pooler')
    project_ref = parsed.hostname.split('.')[0]
    if connection.username != 'postgres.' + project_ref or not connection.hostname.endswith('.pooler.supabase.com'):
        raise ValueError('เลือก Transaction pooler ของโปรเจกต์เดียวกับ Project URL')
    return {
        'NEXT_PUBLIC_SUPABASE_URL': project_url,
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': key.strip(),
        'DATABASE_URL': database_url,
        'NEXT_PUBLIC_SITE_URL': 'http://localhost:3004',
        'SETTINGS_ENCRYPTION_KEY': base64.b64encode(secrets.token_bytes(32)).decode(),
    }


def main():
    if not sys.stdin.isatty():
        raise ValueError('เปิดคำสั่งนี้ใน Terminal ของคุณเองเท่านั้น')
    destination = ROOT / '.env.local'
    if destination.exists():
        raise ValueError('มี .env.local อยู่แล้ว จึงยังไม่เขียนทับ ติดต่อกลับเพื่อปรับเฉพาะค่าที่จำเป็น')
    print('ตั้งค่า Saga Forge Cloud — ค่าที่วางจะไม่แสดงบนหน้าจอ')
    project_url = getpass.getpass('1. Project URL: ')
    key = getpass.getpass('2. Publishable key (ไม่ใช่ Secret key): ')
    connection = getpass.getpass('3. Transaction pooler URI จากปุ่ม Connect: ')
    password = ''
    if '[YOUR-PASSWORD]' in connection or '[YOUR-DATABASE-PASSWORD]' in connection:
        password = getpass.getpass('4. Database password ที่บันทึกไว้ตอนสร้างโปรเจกต์: ')
    values = prepare_values(project_url, key, connection, password)
    content = '# Local cloud configuration. Never commit this file.\n'
    content += ''.join(name + '=' + json.dumps(value) + '\n' for name, value in values.items())
    descriptor = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'w') as output:
        output.write(content)
    print('บันทึกแล้ว ค่าถูกเก็บใน .env.local ของรุ่น Cloud เท่านั้น ยังไม่ได้ย้ายหรือแก้ไขนิยายเดิม')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyboardInterrupt, EOFError):
        print('ยังไม่ได้บันทึก: กรุณาตรวจค่าที่กรอก หรือแจ้งว่าติดขั้นตอนไหน โดยไม่ส่งคีย์หรือรหัสผ่าน')
        sys.exit(1)
