import sqlite3
import getpass
import bcrypt
import os

def run():
    print("Al Haramain Admin PIN Setup")
    pin = getpass.getpass("Enter new PIN (4-8 digits): ")
    if len(pin) < 4 or not pin.isdigit():
        print("Invalid PIN. Must be numeric and at least 4 digits.")
        return
    confirm = getpass.getpass("Confirm PIN: ")
    if pin != confirm:
        print("PINs do not match.")
        return
        
    pin_hash = bcrypt.hashpw(pin.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    db_path = os.path.join(os.path.dirname(__file__), '../data/alharamain.sqlite')
    conn = sqlite3.connect(db_path)
    conn.execute("DELETE FROM admin_credentials")
    conn.execute("INSERT INTO admin_credentials (pin_hash, created_at, updated_at) VALUES (?, datetime('now'), datetime('now'))", (pin_hash,))
    conn.commit()
    conn.close()
    print("Admin PIN successfully updated.")

if __name__ == "__main__":
    run()
