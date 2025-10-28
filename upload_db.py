import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Database connection from Railway
DATABASE_URL = "postgresql://postgres:INfENuUnOooBkmnAQNDAvCNxIslNNeCy@metro.proxy.rlwy.net:59474/railway"

# Read SQL file
with open('database/KHAWAM_DB.sql', 'r', encoding='utf-8') as f:
    sql_content = f.read()

print("Connecting to database...")
conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cursor = conn.cursor()

print("Executing SQL...")
# Execute the entire SQL file as one command
try:
    cursor.execute(sql_content)
    print("✅ All SQL statements executed successfully!")
except Exception as e:
    print(f"Error executing SQL: {e}")
    print("\nTrying to execute statement by statement...")
    
    # Fallback: try to execute statement by statement
    statements = sql_content.split(';')
    for i, statement in enumerate(statements):
        statement = statement.strip()
        if statement:
            try:
                cursor.execute(statement)
                print(f"Statement {i+1} executed")
            except Exception as e:
                print(f"Error in statement {i+1}: {e}")

cursor.close()
conn.close()

print("✅ Database migration complete!")

