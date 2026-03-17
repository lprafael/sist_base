import psycopg2
conn = psycopg2.connect('postgresql://postgres:admin@localhost:5432/SIGEL')
cur = conn.cursor()

cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'electoral' AND table_type = 'BASE TABLE'")
tables = [r[0] for r in cur.fetchall()]

for t in tables:
    cur.execute(f'SELECT COUNT(*) FROM electoral."{t}"')
    print(f"{t}: {cur.fetchone()[0]}")

conn.close()
