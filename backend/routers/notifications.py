from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from jose import JWTError, jwt
from typing import Optional
from database import SessionLocal
from notifications import order_notifications
from .auth import SECRET_KEY, ALGORITHM

router = APIRouter()


async def _validate_staff_token(token: str) -> Optional[int]:
    """التحقق من أن التوكن صالح وأن المستخدم موظف أو مدير."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    db = SessionLocal()
    try:
        from sqlalchemy import text

        user_row = db.execute(
            text(
                """
                SELECT u.id, ut.name_ar
                FROM users u
                JOIN user_types ut ON ut.id = u.user_type_id
                WHERE u.id = :user_id AND u.is_active = true
                """
            ),
            {"user_id": user_id},
        ).fetchone()

        if not user_row:
            return None

        _, role_name = user_row
        if role_name not in ("مدير", "موظف"):
            return None

        return user_row[0]
    finally:
        db.close()


@router.websocket("/ws/orders")
async def orders_notifications(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = await _validate_staff_token(token)
    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await order_notifications.connect(websocket)

    try:
        while True:
            # نحافظ على الاتصال مفتوحاً عبر استقبال أي رسائل (مثل ping) من العميل
            await websocket.receive_text()
    except WebSocketDisconnect:
        await order_notifications.disconnect(websocket)
    except Exception:
        await order_notifications.disconnect(websocket)
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)

