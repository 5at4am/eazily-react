const ENGLISH = 'English';

function applyEnglish() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem('eazily-language', ENGLISH);
  } catch {
    // The app remains English if storage is unavailable.
  }
  if (typeof document !== 'undefined') document.documentElement.lang = 'en';
}

// Normalize older devices that may still have Hindi saved as the interface language.
applyEnglish();

export function translate(value) {
  return value;
}

export function setLanguage() {
  applyEnglish();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('eazily-language'));
  return ENGLISH;
}
