// Development-only navigation aid. It never submits or approves an application.
export const SERVICE_REGISTRATION_TEST_SKIP_ENABLED = import.meta.env.DEV
  && import.meta.env.VITE_ENABLE_SERVICE_REGISTRATION_TEST_SKIP === 'true';
