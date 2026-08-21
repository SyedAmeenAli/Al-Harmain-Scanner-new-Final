import sqlite3
import bcrypt
import os

pin = "1234"
pin_hash = bcrypt.hashpw(pin.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

db_path = os.path.join(os.path.dirname(__file__), 'data/alharamain.sqlite')
conn = sqlite3.connect(db_path)
conn.execute("DELETE FROM admin_credentials")
conn.execute("INSERT INTO admin_credentials (pin_hash, created_at, updated_at) VALUES (?, datetime('now'), datetime('now'))", (pin_hash,))
conn.commit()
conn.close()
print("PIN reset to 1234")
