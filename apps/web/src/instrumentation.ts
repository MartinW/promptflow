import { OTLPHttpJsonTraceExporter, registerOTel } from "@vercel/otel";

export function register(): void {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  if (!publicKey || !secretKey) return;

  const host = process.env.LANGFUSE_HOST ?? "https://cloud.langfuse.com";
  const auth = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");

  registerOTel({
    serviceName: "promptflow-web",
    traceExporter: new OTLPHttpJsonTraceExporter({
      url: `${host}/api/public/otel/v1/traces`,
      headers: { Authorization: `Basic ${auth}` },
    }),
  });
}
