const REQUIRED_IN_PRODUCTION = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'DB_HOST',
  'DB_PASSWORD',
  'CORS_ORIGINS',
];

const INSECURE_DEFAULTS = ['change-me', 'secret', 'password', 'changeme'];

export function validateEnv(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Variables d'environnement manquantes : ${missing.join(', ')}`,
    );
  }

  const insecure = REQUIRED_IN_PRODUCTION.filter((key) => {
    const val = (process.env[key] ?? '').toLowerCase();
    return INSECURE_DEFAULTS.some((d) => val.includes(d));
  });
  if (insecure.length > 0) {
    throw new Error(
      `Valeurs non sécurisées détectées pour : ${insecure.join(', ')} — utilisez openssl rand -base64 32`,
    );
  }
}
