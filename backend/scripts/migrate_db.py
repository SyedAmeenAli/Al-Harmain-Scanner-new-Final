import sqlite3

def run():
    conn = sqlite3.connect("data/alharamain.sqlite")
    c = conn.cursor()
    
    # 1. Add columns for importer safety
    try:
        c.execute("ALTER TABLE products ADD COLUMN origin TEXT DEFAULT 'import'")
        print("Added origin")
    except Exception as e:
        print("Cols might exist:", e)
        
    try:
        c.execute("ALTER TABLE products ADD COLUMN admin_modified_at TEXT")
        print("Added admin_modified_at")
    except Exception as e:
        print("Cols might exist:", e)
        
    try:
        c.execute("ALTER TABLE products ADD COLUMN deleted_at TEXT")
        print("Added deleted_at")
    except Exception as e:
        print("Cols might exist:", e)

    # 2. Create Admin Tables
    c.executescript("""
    CREATE TABLE IF NOT EXISTS admin_credentials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pin_hash TEXT NOT NULL,
        created_at TEXT,
        updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS admin_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_hash TEXT NOT NULL,
        created_at TEXT,
        expires_at TEXT,
        last_seen_at TEXT,
        revoked_at TEXT
    );
    CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        product_id INTEGER,
        timestamp TEXT NOT NULL,
        summary TEXT
    );
    """)
    conn.commit()
    print("Admin tables created.")
    conn.close()

if __name__ == "__main__":
    run()
