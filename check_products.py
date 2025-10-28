import psycopg2

DATABASE_URL = "postgresql://postgres:INfENuUnOooBkmnAQNDAvCNxIslNNeCy@metro.proxy.rlwy.net:59474/railway"

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

# Check products directly
cursor.execute("SELECT id, name_ar, price FROM products LIMIT 10")
products = cursor.fetchall()

print("=== Products in Database ===")
for p in products:
    print(f"ID: {p[0]}, Name: {p[1]}, Price: {p[2]}")

cursor.close()
conn.close()

