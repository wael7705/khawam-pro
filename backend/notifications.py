import asyncio
from typing import Any, Dict, List, Set
from fastapi import WebSocket


class OrderNotificationManager:
    """Singleton-style مدير يتابع اتصالات WebSocket ويبث إشعارات الطلبات الجديدة."""

    def __init__(self) -> None:
        self._connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()
    
    def get_connection_count(self) -> int:
        """الحصول على عدد الاتصالات النشطة"""
        return len(self._connections)

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)
        print(f"✅ WebSocket connected. Total connections: {len(self._connections)}")

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            if websocket in self._connections:
                self._connections.remove(websocket)
                print(f"✅ WebSocket disconnected. Remaining connections: {len(self._connections)}")

    async def _send_json(self, websocket: WebSocket, message: Dict[str, Any]) -> None:
        await websocket.send_json(message)

    async def broadcast(self, message: Dict[str, Any]) -> None:
        """إرسال رسالة لجميع الاتصالات النشطة، مع تنظيف الاتصالات غير الصالحة."""
        async with self._lock:
            connections: List[WebSocket] = list(self._connections)
        
        if not connections:
            print("⚠️ No WebSocket connections to broadcast to")
            return

        print(f"📡 Broadcasting to {len(connections)} WebSocket connection(s)")
        stale_connections: List[WebSocket] = []
        success_count = 0

        for connection in connections:
            try:
                await self._send_json(connection, message)
                success_count += 1
            except Exception as e:
                print(f"⚠️ Failed to send to WebSocket connection: {e}")
                stale_connections.append(connection)

        print(f"✅ Successfully broadcasted to {success_count}/{len(connections)} connections")

        for connection in stale_connections:
            await self.disconnect(connection)
        
        if stale_connections:
            print(f"🧹 Cleaned up {len(stale_connections)} stale connection(s)")


order_notifications = OrderNotificationManager()

