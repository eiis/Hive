"""CLI entry point: python -m backend.mcp"""

import asyncio

from .server import run_mcp_server

if __name__ == "__main__":
    asyncio.run(run_mcp_server())
