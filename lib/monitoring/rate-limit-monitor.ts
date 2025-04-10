import { redis } from "@/lib/redis";

const LIMITS = { rpm: 15, rpd: 1500, tpm: 1000000 };

/**
 * Monitor Gemini API usage against rate limits
 * Tracks requests per minute (RPM), requests per day (RPD), and tokens per minute (TPM)
 */
export async function monitorRateLimits() {
  const now = Math.floor(Date.now() / 1000);
  const minuteKey = `gemini:rpm:${Math.floor(now / 60)}`;
  const dayKey = `gemini:rpd:${new Date().toISOString().split("T")[0]}`;
  const tokenKey = `gemini:tpm:${Math.floor(now / 60)}`;

  const [rpmUsed, rpdUsed, tpmUsed] = await Promise.all([
    redis.get(minuteKey).then((v) => Number(v) || 0),
    redis.get(dayKey).then((v) => Number(v) || 0),
    redis.get(tokenKey).then((v) => Number(v) || 0),
  ]);

  const usage = {
    rpm: rpmUsed / LIMITS.rpm,
    rpd: rpdUsed / LIMITS.rpd,
    tpm: tpmUsed / LIMITS.tpm,
  };

  if (usage.rpm > 0.8 || usage.rpd > 0.8 || usage.tpm > 0.8) {
    console.warn("High API usage detected:", usage);
    // Send alert (e.g., via email or Slack)
    // This can be expanded with a notification service
  }

  return usage;
}

/**
 * Track API usage by incrementing counters in Redis
 * @param tokensUsed Estimated tokens used in the request
 */
export async function trackApiUsage(tokensUsed: number = 0) {
  const now = Math.floor(Date.now() / 1000);
  const minuteKey = `gemini:rpm:${Math.floor(now / 60)}`;
  const dayKey = `gemini:rpd:${new Date().toISOString().split("T")[0]}`;
  const tokenKey = `gemini:tpm:${Math.floor(now / 60)}`;

  await Promise.all([
    redis.incr(minuteKey),
    redis.expire(minuteKey, 120), // Keep for 2 minutes for overlap
    redis.incr(dayKey),
    redis.expire(dayKey, 86400 + 3600), // Keep for 25 hours for overlap
    redis.incrby(tokenKey, tokensUsed),
    redis.expire(tokenKey, 120), // Keep for 2 minutes for overlap
  ]);

  // Monitor after updating
  return monitorRateLimits();
} 