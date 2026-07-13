import "dotenv/config";

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtAccessSecret: required("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  r2: {
    endpoint: process.env.R2_ENDPOINT ?? "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    bucket: process.env.R2_BUCKET ?? "blaze-photos",
  },
  // Optional (not required()) on purpose: existing deploys without these set
  // yet shouldn't fail to boot — the superuser login path just stays
  // inactive (see auth.service.js) until both are configured.
  superuser: {
    email: process.env.SUPERUSER_EMAIL ?? "",
    password: process.env.SUPERUSER_PASSWORD ?? "",
  },
};
