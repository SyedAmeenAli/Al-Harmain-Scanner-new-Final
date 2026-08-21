import sys

with open("catalogue_db.py", "r") as f:
    code = f.read()

# 1. list_products
code = code.replace(
    'sort: str = "name",\n) -> dict:',
    'sort: str = "name",\n    include_deleted: bool = False,\n) -> dict:'
)
code = code.replace(
    'where = ["p.deleted_at IS NULL"]',
    'where = []\n    if not include_deleted:\n        where.append("p.deleted_at IS NULL")'
)

# 2. get_product
code = code.replace(
    'def get_product(identifier: str) -> Optional[dict]:',
    'def get_product(identifier: str, include_deleted: bool = False) -> Optional[dict]:'
)
code = code.replace(
    '"SELECT * FROM products WHERE slug = ? OR id = ?", (identifier, identifier)',
    'f"SELECT * FROM products WHERE (slug = ? OR id = ?) {\'AND deleted_at IS NULL\' if not include_deleted else \'\'}", (identifier, identifier)'
)
code = code.replace(
    '"SELECT * FROM products WHERE id = ?", (int(identifier),)',
    'f"SELECT * FROM products WHERE id = ? {\'AND deleted_at IS NULL\' if not include_deleted else \'\'}", (int(identifier),)'
)

# 3. related_products
code = code.replace(
    'def related_products(identifier: str, limit: int = 6) -> list[dict]:',
    'def related_products(identifier: str, limit: int = 6, include_deleted: bool = False) -> list[dict]:'
)
code = code.replace(
    'product = get_product(identifier)',
    'product = get_product(identifier, include_deleted=include_deleted)'
)
code = code.replace(
    '"SELECT * FROM products WHERE slug != ?", (product["slug"],)',
    'f"SELECT * FROM products WHERE slug != ? {\'AND deleted_at IS NULL\' if not include_deleted else \'\'}", (product["slug"],)'
)

# 4. search_products
code = code.replace(
    'def search_products(q: str, limit: int = 30, category: Optional[str] = None) -> list[dict]:',
    'def search_products(q: str, limit: int = 30, category: Optional[str] = None, include_deleted: bool = False) -> list[dict]:'
)
code = code.replace(
    'rows = conn.execute("SELECT * FROM products").fetchall()',
    'where_clause = "WHERE deleted_at IS NULL" if not include_deleted else ""\n        rows = conn.execute(f"SELECT * FROM products {where_clause}").fetchall()'
)

with open("catalogue_db.py", "w") as f:
    f.write(code)

print("Patch applied to catalogue_db.py")
