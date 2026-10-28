// Email OTP length must match the hosted Supabase setting.
const configuredEmailLength = Number(import.meta.env.VITE_AUTH_EMAIL_OTP_LENGTH || 8);
export const EMAIL_OTP_LENGTH = Number.isInteger(configuredEmailLength) && configuredEmailLength >= 6 && configuredEmailLength <= 10 ? configuredEmailLength : 8;
