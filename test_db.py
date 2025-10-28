import psycopg2

DATABASE_URL = "postgresql://postgres:INfENuUnOooBkmnAQNDAvCNxIslNNeCy@metro.proxy.rlwy.net:59474/railway"

print("Connecting to database...")
conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

# Test queries
queries = [
    ("SELECT COUNT(*) FROM users", "Users"),
    ("SELECT COUNT(*) FROM products", "Products"),
    ("SELECT COUNT(*) FROM services", "Services"),
    ("SELECT COUNT(*) FROM portfolio_works", "Portfolio"),
    ("SELECT COUNT(*) FROM orders", "Orders"),
]

print("\n=== Database Status ===\n")
for query, name in queries:
    try:
        cursor.execute(query)
        count = cursor.fetchone()[0]
        print(f"{name}: {count}")
    except Exception as e:
        print(f"{name}: Error - {e}")

cursor.close()
conn.close()

