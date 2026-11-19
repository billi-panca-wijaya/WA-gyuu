import { BadRequestException } from '@nestjs/common';

export const OTP_MINUTES = 5;
export const DEFAULT_OTP_TEMPLATE = 'Kode verifikasi :brand Anda adalah :code. Berlaku :minutes menit.';
export const OTP_SAFETY_FOOTER = 'Demi keamanan akun Anda, jangan bagikan kode ini kepada siapa pun.';

export function normalizeOtpTemplate(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 500) {
    throw new BadRequestException('Templat wajib diisi, maksimal 500 karakter.');
  }
  const tokens = value.match(/:[a-z_][a-z_0-9]*/gi) ?? [];
  if (tokens.filter(token => token === ':code').length !== 1
      || tokens.some(token => ![':brand', ':code', ':minutes'].includes(token))) {
    throw new BadRequestException('Gunakan :code tepat satu kali. Variabel lain yang tersedia adalah :brand dan :minutes.');
  }
  return value.trim();
}

export function brandSettings(config: string | null): Record<string, unknown> {
  try {
    const parsed = JSON.parse(config ?? '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function otpTemplate(config: string | null): string {
  const saved = brandSettings(config).otpTemplate;
  if (typeof saved === 'string') {
    try {
      return normalizeOtpTemplate(saved);
    } catch {
      // An invalid stored template cannot prevent OTP delivery.
    }
  }
  return DEFAULT_OTP_TEMPLATE;
}

export function renderOtpMessage(config: string | null, brand: string, code: string): string {
  const values = { brand, code: `*${code}*`, minutes: String(OTP_MINUTES) };
  const body = otpTemplate(config).replace(/:(brand|code|minutes)\b/g, (_, token: keyof typeof values) => values[token]);
  return body + '\n\n' + OTP_SAFETY_FOOTER;
}

export function isOtpMessage(text: string): boolean {
  return /jangan\s+bagikan\s+kode\s+ini|do\s+not\s+share\s+this\s+code/i.test(text)
    || /kode\s+(?:verifikasi|masuk|otp)\b.*\b\d{4,8}\b/i.test(text)
    || /\b\d{4,8}\b.*\bberlaku\s+\d+\s+menit\b/i.test(text);
}
