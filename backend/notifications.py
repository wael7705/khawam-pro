import asyncio
from typing import Any, Dict, List, Set
from fastapi import WebSocket


class OrderNotificationManager:
    """Singleton-style مدير يتابع اتصالات WebSocket ويبث إشعارات الطلبات الجديدة."""

    def __init__(self) -> None:
        self._connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            if websocket in self._connections:
                self._connections.remove(websocket)

    async def _send_json(self, websocket: WebSocket, message: Dict[str, Any]) -> None:
        await websocket.send_json(message)

    async def broadcast(self, message: Dict[str, Any]) -> None:
        """إرسال رسالة لجميع الاتصالات النشطة، مع تنظيف الاتصالات غير الصالحة."""
        async with self._lock:
            connections: List[WebSocket] = list(self._connections)

        stale_connections: List[WebSocket] = []

        for connection in connections:
            try:
                await self._send_json(connection, message)
            except Exception:
                stale_connections.append(connection)

        for connection in stale_connections:
            await self.disconnect(connection)


order_notifications = OrderNotificationManager()

