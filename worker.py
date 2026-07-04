"""Worker entry point for Render background worker."""
import sys
sys.path.insert(0, ".")

from bot import bot_worker
import asyncio

if __name__ == "__main__":
    asyncio.run(bot_worker())
