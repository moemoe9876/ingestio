import { Redis } from '@upstash/redis'

// Use environment variables for Redis connection
const getRedisUrl = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL
  if (!url) {
    throw new Error("UPSTASH_REDIS_REST_URL is not defined in environment variables")
  }
  return url
}

const getRedisToken = () => {
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!token) {
    throw new Error("UPSTASH_REDIS_REST_TOKEN is not defined in environment variables")
  }
  return token
}

/**
 * Create a singleton Redis client instance using Upstash
 * This client will be used for rate limiting and potentially caching
 */
export const redis = new Redis({
  url: getRedisUrl(),
  token: getRedisToken(),
  automaticDeserialization: true, // Auto deserialize JSON data
})

// Export a type-safe client
type RedisClient = typeof redis

// Export a function to get the Redis client for use in other modules
export const getRedisClient = (): RedisClient => {
  return redis
}

/**
 * Helper function to check if Redis is connected
 * Useful for health checks and debugging
 */
export const pingRedis = async (): Promise<boolean> => {
  try {
    const response = await redis.ping()
    return response === 'PONG'
  } catch (error) {
    console.error('Redis connection error:', error)
    return false
  }
} 