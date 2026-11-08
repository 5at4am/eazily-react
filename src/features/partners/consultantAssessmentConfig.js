// Development-only assessment skip. It never records an assessment pass.
export const CONSULTANT_ASSESSMENT_TEST_SKIP_ENABLED = import.meta.env.DEV
  && import.meta.env.VITE_ENABLE_CONSULTANT_ASSESSMENT_TEST_SKIP === 'true';
