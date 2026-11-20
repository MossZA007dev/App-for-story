export function accountErrorMessage(error:{code?:string;status?:number},mode:'signin'|'signup'){
 switch(error.code){
  case 'over_email_send_rate_limit':return 'Supabase ส่งอีเมลยืนยันถึงโควตาแล้ว บริการอีเมลเริ่มต้นส่งได้ 2 ฉบับต่อชั่วโมงต่อโปรเจกต์ ลองตรวจกล่องจดหมายและสแปมก่อน หากยังไม่ได้รับต้องรอโควตาคืน หรือตั้งค่าบริการส่งอีเมลของคุณเอง';
  case 'over_request_rate_limit':return 'Supabase จำกัดคำขอชั่วคราว กรุณาพักการสมัครหรือเข้าสู่ระบบแล้วลองใหม่ภายหลัง';
  case 'email_address_not_authorized':return 'บริการอีเมลเริ่มต้นของ Supabase ส่งได้เฉพาะอีเมลสมาชิกในทีมของโปรเจกต์ เจ้าของต้องตั้งค่า SMTP ก่อนส่งยืนยันไปยังอีเมลอื่น';
  case 'email_not_confirmed':return 'บัญชียังไม่ได้ยืนยันอีเมล กรุณาเปิดลิงก์ยืนยันในกล่องจดหมายหรือสแปม แล้วกลับมาเข้าสู่ระบบ';
  case 'invalid_credentials':return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจแล้วลองใหม่';
  case 'weak_password':return 'รหัสผ่านยังไม่ผ่านเงื่อนไข กรุณาใช้รหัสผ่านที่ยาวและคาดเดาได้ยาก';
  case 'signup_disabled':return 'โปรเจกต์ Supabase ยังไม่เปิดรับสมัครบัญชี เจ้าของต้องเปิดการสมัครใน Authentication ก่อน';
  default:return error.status===429?'Supabase จำกัดคำขอชั่วคราว กรุณารอแล้วลองใหม่ภายหลัง':mode==='signin'?'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจอีเมล รหัสผ่าน และการยืนยันอีเมล':'สร้างบัญชีไม่สำเร็จ กรุณาตรวจอีเมลและการตั้งค่ารับสมัครของ Supabase';
 }
}
