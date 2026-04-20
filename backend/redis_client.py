import redis
port = 6379
redis_client = redis.Redis(
    host='localhost',
    port=port,
    decode_responses=True
)
print(f"Redis hosted on port {port}")