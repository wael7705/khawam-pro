import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

"""
Usage:
  set PUBLIC_BASE_URL=https://khawam-pro-production.up.railway.app
  set DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB
  python backend/normalize_image_urls.py

This script converts any relative image paths to absolute URLs in DB fields:
- products.image_url, products.images[]
- services.image_url
- portfolio_works.image_url, portfolio_works.images[]
"""

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if not DATABASE_URL:
    print("DATABASE_URL not set")
    raise SystemExit(1)

PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "").strip().rstrip("/")
RAILWAY_PUBLIC_DOMAIN = os.environ.get("RAILWAY_PUBLIC_DOMAIN", "").strip()

if not PUBLIC_BASE_URL:
    if RAILWAY_PUBLIC_DOMAIN:
        PUBLIC_BASE_URL = (
            RAILWAY_PUBLIC_DOMAIN if RAILWAY_PUBLIC_DOMAIN.startswith("http") else f"https://{RAILWAY_PUBLIC_DOMAIN}"
        ).rstrip("/")
    else:
        PUBLIC_BASE_URL = "https://khawam-pro-production.up.railway.app"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)


def normalize(value: str) -> str:
    if not value:
        return value
    v = value.replace("\\", "/").strip()
    if v.startswith("http://") or v.startswith("https://"):
        return v
    # already a public uploads path
    if v.startswith("/uploads/"):
        return f"{PUBLIC_BASE_URL}{v}"
    # bare filename → uploads
    if "/" not in v:
        return f"{PUBLIC_BASE_URL}/uploads/{v}"
    # other relative path → ensure leading slash then prepend
    if not v.startswith("/"):
        v = f"/{v}"
    return f"{PUBLIC_BASE_URL}{v}"


def run():
    with engine.begin() as conn:
        # products.image_url
        res = conn.execute(text("SELECT id, image_url, images FROM products"))
        rows = res.fetchall()
        p_updated = 0
        for r in rows:
            pid = r[0]
            img = r[1]
            imgs = r[2]
            changed = False
            new_img = normalize(img) if img else img
            new_imgs = None
            if imgs is not None:
                new_imgs_list = []
                arr_changed = False
                for u in imgs:
                    nu = normalize(u) if u else u
                    new_imgs_list.append(nu)
                    if nu != u:
                        arr_changed = True
                if arr_changed:
                    new_imgs = new_imgs_list
                    changed = True
            if img and new_img != img:
                changed = True
            if changed:
                conn.execute(text("UPDATE products SET image_url=:iu, images=:im WHERE id=:id"),
                             {"iu": new_img, "im": new_imgs if new_imgs is not None else imgs, "id": pid})
                p_updated += 1

        # services.image_url
        res = conn.execute(text("SELECT id, image_url FROM services"))
        rows = res.fetchall()
        s_updated = 0
        for r in rows:
            sid, img = r[0], r[1]
            if img:
                new_img = normalize(img)
                if new_img != img:
                    conn.execute(text("UPDATE services SET image_url=:iu WHERE id=:id"), {"iu": new_img, "id": sid})
                    s_updated += 1

        # portfolio_works.image_url/images
        res = conn.execute(text("SELECT id, image_url, images FROM portfolio_works"))
        rows = res.fetchall()
        w_updated = 0
        for r in rows:
            wid = r[0]
            img = r[1]
            imgs = r[2]
            changed = False
            new_img = normalize(img) if img else img
            new_imgs = None
            if imgs is not None:
                new_imgs_list = []
                arr_changed = False
                for u in imgs:
                    nu = normalize(u) if u else u
                    new_imgs_list.append(nu)
                    if nu != u:
                        arr_changed = True
                if arr_changed:
                    new_imgs = new_imgs_list
                    changed = True
            if img and new_img != img:
                changed = True
            if changed:
                conn.execute(text("UPDATE portfolio_works SET image_url=:iu, images=:im WHERE id=:id"),
                             {"iu": new_img, "im": new_imgs if new_imgs is not None else imgs, "id": wid})
                w_updated += 1

    print({
        "success": True,
        "base_url": PUBLIC_BASE_URL,
        "updated": {"products": p_updated, "services": s_updated, "portfolio_works": w_updated},
    })


if __name__ == "__main__":
    run()

