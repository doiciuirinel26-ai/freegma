import os, time
from fastapi import HTTPException

API_KEY = os.environ.get("FREEGMA_API_KEY", "freegma-dev-key-2026")

# Rate limit: 1 generare per IP per N secunde
RATE_LIMIT_SECONDS = 90
_last_request: dict[str, float] = {}

def validate_key(key: str | None):
    if not key or key != API_KEY:
        raise HTTPException(401, "API key invalid")

def check_rate_limit(ip: str):
    now = time.time()
    last = _last_request.get(ip, 0)
    if now - last < RATE_LIMIT_SECONDS:
        wait = int(RATE_LIMIT_SECONDS - (now - last))
        raise HTTPException(429, f"Asteapta {wait}s inainte de urmatoarea generare")
    _last_request[ip] = now
