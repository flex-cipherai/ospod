// Lets browsers upload episodes straight to the R2 bucket.
// Run once (and again if you add a domain):
//   node --env-file=.env.local scripts/setup-r2-cors.mjs
import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error("Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET first.");
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const origins = [
  "https://ospod.io",
  "https://www.ospod.io",
  "https://ospod.netlify.app",
  "http://localhost:3000",
  "http://localhost:3100",
  ...(process.env.EXTRA_CORS_ORIGINS ?? "").split(",").filter(Boolean),
];

await client.send(
  new PutBucketCorsCommand({
    Bucket: R2_BUCKET,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: origins,
          AllowedMethods: ["PUT", "GET", "HEAD"],
          AllowedHeaders: ["*"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
);
const check = await client.send(new GetBucketCorsCommand({ Bucket: R2_BUCKET }));
console.log("CORS set for:", check.CORSRules?.[0]?.AllowedOrigins?.join(", "));
