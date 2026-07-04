import httpx
import logging
from typing import Any

log = logging.getLogger("fb-client")

API_BASE = "https://graph.facebook.com/v22.0"
_http: httpx.AsyncClient | None = None


class FBClient:
    def __init__(self, token: str, page_id: str):
        self.token = token
        self.page_id = page_id

    async def _get(self, path: str, params: dict = None) -> dict | None:
        global _http
        if _http is None:
            _http = httpx.AsyncClient(timeout=15)
        p = {"access_token": self.token, **(params or {})}
        r = await _http.get(f"{API_BASE}/{path}", params=p)
        if r.status_code != 200:
            log.error(f"GET err {r.status_code}: {r.text[:200]}")
            return None
        return r.json()

    async def _post(self, path: str, data: dict = None) -> dict | None:
        global _http
        if _http is None:
            _http = httpx.AsyncClient(timeout=15)
        d = {"access_token": self.token, **(data or {})}
        r = await _http.post(f"{API_BASE}/{path}", data=d)
        if r.status_code != 200:
            log.error(f"POST err {r.status_code}: {r.text[:200]}")
            return None
        return r.json()

    async def get_page_posts(self, limit: int = 10) -> list:
        r = await self._get(f"{self.page_id}/posts", {"limit": limit, "fields": "id,message,created_time"})
        return (r or {}).get("data", [])

    async def get_post_comments(self, post_id: str, limit: int = 50) -> list:
        r = await self._get(f"{post_id}/comments", {
            "limit": limit, "fields": "id,message,from{name,id},created_time"
        })
        return (r or {}).get("data", [])

    async def reply_to_comment(self, comment_id: str, message: str) -> dict | None:
        return await self._post(f"{comment_id}/comments", {"message": message})

    async def post_to_page(self, message: str) -> dict | None:
        return await self._post(f"{self.page_id}/feed", {"message": message})

    async def delete_comment(self, comment_id: str) -> dict | None:
        return await self._post(f"{comment_id}", {"method": "delete"})

    async def get_page_fan_count(self) -> int:
        r = await self._get(f"{self.page_id}", {"fields": "fan_count"})
        return (r or {}).get("fan_count", 0)

    async def get_post_insights(self, post_id: str) -> dict:
        r = await self._get(f"{post_id}/insights", {
            "metric": "impressions,reach,engaged_users"
        })
        return r or {}

    def get_first_name(self, comment: dict) -> str:
        from_data = comment.get("from", {})
        full = from_data.get("name", "")
        if full:
            return full.split()[0]
        return "صديقنا"

    async def close(self):
        global _http
        if _http:
            await _http.aclose()
            _http = None
