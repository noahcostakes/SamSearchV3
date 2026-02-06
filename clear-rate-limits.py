"""Clear rate limit counters for testing."""
import asyncio
import sys
from redis.asyncio import Redis

async def clear_rate_limits():
    """Clear all rate limit counters from Redis."""
    redis = Redis(host='localhost', port=6379, db=0, decode_responses=True)
    
    try:
        # Find all rate limit keys
        cursor = 0
        deleted_count = 0
        
        async for key in redis.scan_iter(match="usage:search:*"):
            await redis.delete(key)
            deleted_count += 1
            print(f"Deleted: {key}")
        
        print(f"\n✓ Cleared {deleted_count} rate limit counters")
        print("You can now make new search requests!")
        
    except Exception as e:
        print(f"✗ Error: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        await redis.aclose()

if __name__ == "__main__":
    asyncio.run(clear_rate_limits())
