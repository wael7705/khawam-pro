from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from jose import JWTError, jwt
from typing import Optional
from database import SessionLocal
from notifications import order_notifications
from .auth import SECRET_KEY, ALGORITHM, CUSTOM_TOKENS, is_valid_phone, is_valid_email, normalize_phone

router = APIRouter()


async def _validate_staff_token(token: str) -> Optional[int]:
    """التحقق من أن التوكن صالح وأن المستخدم موظف أو مدير - مع دعم Token مخصص"""
    if not token:
        return None
    
    db = SessionLocal()
    try:
        from sqlalchemy import text
        
        # التحقق من Token مخصص أولاً
        if token in CUSTOM_TOKENS.values():
            print(f"✅ WebSocket: Custom token detected: {token}")
            # البحث عن المستخدم المرتبط بهذا Token
            for username, custom_token in CUSTOM_TOKENS.items():
                if custom_token == token:
                    user_row = None
                    
                    # البحث عن المستخدم في قاعدة البيانات
                    if is_valid_phone(username):
                        normalized = normalize_phone(username)
                        variants = [username, normalized, '+' + normalized]
                        if username.startswith('0'):
                            variants.extend(['963' + username[1:], '+963' + username[1:]])
                        if username.startswith('+963'):
                            variants.append(username[1:])
                        if username.startswith('963') and not username.startswith('+'):
                            variants.append('+' + username)
                        
                        for variant in variants:
                            user_row = db.execute(text("""
                                SELECT u.id, ut.name_ar
                                FROM users u
                                JOIN user_types ut ON ut.id = u.user_type_id
                                WHERE u.phone = :phone AND u.is_active = true
                            """), {"phone": variant}).fetchone()
                            if user_row:
                                break
                    elif is_valid_email(username):
                        user_row = db.execute(text("""
                            SELECT u.id, ut.name_ar
                            FROM users u
                            JOIN user_types ut ON ut.id = u.user_type_id
                            WHERE u.email = :email AND u.is_active = true
                        """), {"email": username.lower()}).fetchone()
                    
                    if user_row:
                        user_id, role_name = user_row
                        # التحقق من أن المستخدم مدير أو موظف
                        if role_name in ("مدير", "موظف"):
                            print(f"✅ WebSocket: Custom token validated for user ID: {user_id}, role: {role_name}")
                            return user_id
                        else:
                            print(f"⚠️ WebSocket: User with custom token is not admin/employee: {role_name}")
                            return None
        
        # التحقق من JWT token
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if not user_id:
                return None
        except JWTError:
            print(f"⚠️ WebSocket: JWT token decode failed")
            return None

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

        print(f"✅ WebSocket: JWT token validated for user ID: {user_id}, role: {role_name}")
        return user_row[0]
    except Exception as e:
        print(f"❌ WebSocket token validation error: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        db.close()


@router.websocket("/ws/orders")
async def orders_notifications(websocket: WebSocket):
    token = websocket.query_params.get("token")
    print(f"🔍 WebSocket connection attempt - token: {token[:20] if token else 'None'}...")
    
    if not token:
        print("⚠️ WebSocket: No token provided")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = await _validate_staff_token(token)
    if not user_id:
        print(f"⚠️ WebSocket: Token validation failed for token: {token[:20]}...")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    print(f"✅ WebSocket: Token validated successfully, user_id: {user_id}")
    await order_notifications.connect(websocket)
    print(f"✅ WebSocket: Connection established for user {user_id}")

    try:
        while True:
            # نحافظ على الاتصال مفتوحاً عبر استقبال أي رسائل (مثل ping) من العميل
            await websocket.receive_text()
    except WebSocketDisconnect:
        print(f"⚠️ WebSocket: Disconnected for user {user_id}")
        await order_notifications.disconnect(websocket)
    except Exception as e:
        print(f"❌ WebSocket error for user {user_id}: {e}")
        import traceback
        traceback.print_exc()
        await order_notifications.disconnect(websocket)
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)

