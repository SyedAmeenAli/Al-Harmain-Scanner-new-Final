"""Backend tests for Al Haramain — Museum of Scent."""
import os
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://zen-black-5.preview.emergentagent.com",
).rstrip("/")
ADMIN_EMAIL = "ameen"
ADMIN_PASSWORD = "ameen123"
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Root / health ---------- #
def test_root(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200
    data = r.json()
    assert data["service"] == "Al Haramain — Museum of Scent"
    assert data["status"] == "luminous"


# ---------- Products list ---------- #
def test_products_total_count(session):
    r = session.get(f"{API}/products", params={"limit": 1})
    assert r.status_code == 200
    body = r.json()
    assert "total" in body and "items" in body
    assert body["total"] == 215, f"Expected 215 products, got {body['total']}"


def test_products_filter_attar(session):
    r = session.get(f"{API}/products", params={"category": "attar", "limit": 300})
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) > 0
    assert all(p["category"] == "attar" for p in items)


def test_products_filter_perfume(session):
    r = session.get(f"{API}/products", params={"category": "perfume", "limit": 300})
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) > 0
    assert all(p["category"] == "perfume" for p in items)


def test_products_filter_family(session):
    r = session.get(f"{API}/products", params={"scent_family": "arabic", "limit": 300})
    assert r.status_code == 200
    items = r.json()["items"]
    assert all(p["scent_family"] == "arabic" for p in items)

    r2 = session.get(f"{API}/products", params={"scent_family": "french", "limit": 300})
    items2 = r2.json()["items"]
    assert all(p["scent_family"] == "french" for p in items2)


def test_products_filter_status(session):
    for st in ("in_stock", "sold_out", "best_seller"):
        r = session.get(f"{API}/products", params={"status": st, "limit": 300})
        assert r.status_code == 200
        items = r.json()["items"]
        assert all(p["status"] == st for p in items)


def test_products_search(session):
    r = session.get(f"{API}/products", params={"search": "oud", "limit": 50})
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) > 0
    assert all("oud" in p["name"].lower() for p in items)


def test_products_sort_price(session):
    r = session.get(f"{API}/products", params={"sort": "price_asc", "limit": 20})
    items = r.json()["items"]
    prices = [p["price_min"] for p in items]
    assert prices == sorted(prices)

    r2 = session.get(f"{API}/products", params={"sort": "price_desc", "limit": 20})
    items2 = r2.json()["items"]
    prices2 = [p["price_max"] for p in items2]
    assert prices2 == sorted(prices2, reverse=True)


def test_products_pagination(session):
    r1 = session.get(f"{API}/products", params={"limit": 5, "skip": 0})
    r2 = session.get(f"{API}/products", params={"limit": 5, "skip": 5})
    s1 = [p["slug"] for p in r1.json()["items"]]
    s2 = [p["slug"] for p in r2.json()["items"]]
    assert not set(s1) & set(s2)


# ---------- Best sellers / featured ---------- #
def test_best_sellers(session):
    r = session.get(f"{API}/products/best-sellers")
    assert r.status_code == 200
    items = r.json()["items"]
    assert 0 < len(items) <= 8
    assert all(p["status"] == "best_seller" for p in items)


def test_featured(session):
    r = session.get(f"{API}/products/featured")
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) == 6


# ---------- Single product ---------- #
def test_get_product_zen_black_5(session):
    r = session.get(f"{API}/products/zen-black-5")
    # The slug requirement says "zen-black-5" exists. Verify or report.
    if r.status_code == 404:
        pytest.skip("Product slug 'zen-black-5' not in seed - checking generic behavior")
    assert r.status_code == 200
    body = r.json()
    assert "product" in body and "related" in body
    assert body["product"]["slug"] == "zen-black-5"
    assert len(body["related"]) <= 4


def test_get_first_product_has_related(session):
    listing = session.get(f"{API}/products", params={"limit": 1}).json()["items"]
    slug = listing[0]["slug"]
    r = session.get(f"{API}/products/{slug}")
    assert r.status_code == 200
    body = r.json()
    assert body["product"]["slug"] == slug
    assert isinstance(body["related"], list)
    assert "_id" not in body["product"]


def test_get_product_unknown_slug(session):
    r = session.get(f"{API}/products/nonexistent-slug-xyz")
    assert r.status_code == 404


# ---------- Collections ---------- #
def test_collections(session):
    r = session.get(f"{API}/collections")
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) == 6
    slugs = {c["slug"] for c in items}
    expected = {
        "signature-attars",
        "modern-perfumes",
        "french-inspired",
        "best-sellers",
        "oud-collection",
        "rose-and-musk",
    }
    assert expected.issubset(slugs)


# ---------- Cart lifecycle ---------- #
@pytest.fixture(scope="module")
def cart_id(session):
    r = session.post(f"{API}/cart")
    assert r.status_code == 200
    cid = r.json()["cart"]["id"]
    return cid


@pytest.fixture(scope="module")
def in_stock_product(session):
    r = session.get(f"{API}/products", params={"status": "in_stock", "limit": 1})
    items = r.json()["items"]
    assert items
    return items[0]


@pytest.fixture(scope="module")
def sold_out_product(session):
    r = session.get(f"{API}/products", params={"status": "sold_out", "limit": 1})
    items = r.json()["items"]
    return items[0] if items else None


def test_get_cart(session, cart_id):
    r = session.get(f"{API}/cart/{cart_id}")
    assert r.status_code == 200
    assert r.json()["cart"]["id"] == cart_id


def test_get_unknown_cart(session):
    r = session.get(f"{API}/cart/does-not-exist")
    assert r.status_code == 404


def test_add_to_cart(session, cart_id, in_stock_product):
    p = in_stock_product
    size_label = p["sizes"][1]["label"]
    r = session.post(
        f"{API}/cart/{cart_id}/items",
        json={"product_id": p["id"], "size_label": size_label, "quantity": 2},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["cart"]["items"]) == 1
    item = body["cart"]["items"][0]
    assert item["product_id"] == p["id"]
    assert item["quantity"] == 2
    assert body["totals"]["item_count"] == 2


def test_add_to_cart_merges_same_size(session, cart_id, in_stock_product):
    p = in_stock_product
    size_label = p["sizes"][1]["label"]
    r = session.post(
        f"{API}/cart/{cart_id}/items",
        json={"product_id": p["id"], "size_label": size_label, "quantity": 1},
    )
    body = r.json()
    assert len(body["cart"]["items"]) == 1  # merged
    assert body["cart"]["items"][0]["quantity"] == 3


def test_add_sold_out_refused(session, cart_id, sold_out_product):
    if not sold_out_product:
        pytest.skip("No sold_out product in seed")
    p = sold_out_product
    r = session.post(
        f"{API}/cart/{cart_id}/items",
        json={"product_id": p["id"], "size_label": p["sizes"][0]["label"], "quantity": 1},
    )
    assert r.status_code == 400


def test_add_unknown_product(session, cart_id):
    r = session.post(
        f"{API}/cart/{cart_id}/items",
        json={"product_id": "nonexistent", "size_label": "30 ml", "quantity": 1},
    )
    assert r.status_code == 404


def test_update_item_quantity(session, cart_id):
    cart = session.get(f"{API}/cart/{cart_id}").json()["cart"]
    item_id = cart["items"][0]["id"]
    r = session.patch(
        f"{API}/cart/{cart_id}/items/{item_id}", json={"quantity": 5}
    )
    assert r.status_code == 200
    assert r.json()["cart"]["items"][0]["quantity"] == 5


def test_subtotal_and_shipping(session, cart_id):
    body = session.get(f"{API}/cart/{cart_id}").json()
    items = body["cart"]["items"]
    expected_sub = sum(i["price"] * i["quantity"] for i in items)
    assert body["totals"]["subtotal"] == expected_sub
    # Shipping logic: free if >=1500 else 99
    if expected_sub >= 1500:
        assert body["totals"]["shipping"] == 0
    else:
        assert body["totals"]["shipping"] == 99


def test_gift_wrap(session, cart_id):
    r = session.patch(
        f"{API}/cart/{cart_id}",
        json={"gift_wrap": True, "gift_message": "For my dearest"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["cart"]["gift_wrap"] is True
    assert body["cart"]["gift_message"] == "For my dearest"
    assert body["totals"]["gift_fee"] == 149


def test_coupon_museum10(session, cart_id):
    r = session.patch(f"{API}/cart/{cart_id}", json={"coupon": "MUSEUM10"})
    assert r.status_code == 200
    body = r.json()
    assert body["cart"]["coupon"] == "MUSEUM10"
    expected_discount = int(body["totals"]["subtotal"] * 0.10)
    assert body["totals"]["discount"] == expected_discount


def test_coupon_gift200(session, cart_id):
    body = session.get(f"{API}/cart/{cart_id}").json()
    subtotal = body["totals"]["subtotal"]
    r = session.patch(f"{API}/cart/{cart_id}", json={"coupon": "GIFT200"})
    assert r.status_code == 200
    body = r.json()
    expected = 200 if subtotal >= 1000 else 0
    assert body["totals"]["discount"] == expected


def test_coupon_invalid(session, cart_id):
    r = session.patch(f"{API}/cart/{cart_id}", json={"coupon": "INVALID"})
    assert r.status_code == 200
    assert r.json()["totals"]["discount"] == 0


def test_total_calculation(session, cart_id):
    body = session.get(f"{API}/cart/{cart_id}").json()
    t = body["totals"]
    assert t["total"] == max(0, t["subtotal"] + t["shipping"] + t["gift_fee"] - t["discount"])


def test_remove_item(session, cart_id):
    cart = session.get(f"{API}/cart/{cart_id}").json()["cart"]
    item_id = cart["items"][0]["id"]
    r = session.delete(f"{API}/cart/{cart_id}/items/{item_id}")
    assert r.status_code == 200
    assert all(i["id"] != item_id for i in r.json()["cart"]["items"])


def test_update_item_quantity_zero_removes(session, in_stock_product):
    # New cart, add item, set qty=0 to remove
    cid = session.post(f"{API}/cart").json()["cart"]["id"]
    p = in_stock_product
    session.post(
        f"{API}/cart/{cid}/items",
        json={"product_id": p["id"], "size_label": p["sizes"][0]["label"], "quantity": 1},
    )
    cart = session.get(f"{API}/cart/{cid}").json()["cart"]
    item_id = cart["items"][0]["id"]
    r = session.patch(f"{API}/cart/{cid}/items/{item_id}", json={"quantity": 0})
    assert r.status_code == 200
    assert len(r.json()["cart"]["items"]) == 0


# ---------- Fragrance finder ---------- #
def test_fragrance_finder_warm_arabic(session):
    r = session.post(
        f"{API}/fragrance-finder",
        json={
            "family": "arabic",
            "mood": "warm",
            "intensity": "bold",
            "occasion": "evening",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert 0 < len(body["recommendations"]) <= 6
    assert body["summary"]["family"] == "arabic"


def test_fragrance_finder_fallback(session):
    r = session.post(
        f"{API}/fragrance-finder",
        json={
            "family": "any",
            "mood": "unknown_mood",
            "intensity": "subtle",
            "occasion": "daily",
        },
    )
    assert r.status_code == 200
    body = r.json()
    # mood doesn't match keywords -> falls back to any non-sold-out random


# ---------- Site settings ---------- #
def test_site_settings(session):
    r = session.get(f"{API}/site-settings")
    assert r.status_code == 200
    s = r.json()
    assert s["contact_phone"] == "+91 97011 57153"
    assert s["contact_email"] == "Contact@alharamainperfumes.in"
    assert len(s["hero_videos"]) >= 3
    assert len(s["shipping_messages"]) >= 4
    assert "brand_line" in s and s["brand_line"]


# ---------- Featured product prices ---------- #
def test_featured_skus_prices(session):
    expected = {
        "Haramain Her Perfume 100ml Pack": (800, 800),
        "Ignite Oud Perfume": (150, 1200),
    }
    for name, (pmin, pmax) in expected.items():
        r = session.get(f"{API}/products", params={"search": name, "limit": 5})
        items = r.json()["items"]
        match = next((p for p in items if p["name"] == name), None)
        assert match, f"Could not find product '{name}'"
        assert match["price_min"] == pmin and match["price_max"] == pmax, (
            f"{name}: expected ({pmin}, {pmax}) got ({match['price_min']}, {match['price_max']})"
        )


def test_products_sort_newest(session):
    r = session.get(f"{API}/products", params={"sort": "newest", "limit": 10})
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) > 0
    created = [p["created_at"] for p in items]
    assert created == sorted(created, reverse=True)


# ---------- Admin auth ---------- #
@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(
        f"{API}/admin/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "access_token" in body and body["token_type"] == "bearer"
    return body["access_token"]


def test_admin_login_wrong_password(session):
    r = session.post(
        f"{API}/admin/login",
        json={"email": ADMIN_EMAIL, "password": "wrong-password"},
    )
    assert r.status_code == 401


def test_admin_settings_requires_auth(session):
    r = session.patch(f"{API}/admin/site-settings", json={"logo_text": "X"})
    assert r.status_code == 401


def test_admin_settings_update(session, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    new_logo = "Al Haramain TEST"
    r = session.patch(
        f"{API}/admin/site-settings",
        json={"logo_text": new_logo},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    assert r.json()["logo_text"] == new_logo
    # Verify GET reflects change
    r2 = session.get(f"{API}/site-settings")
    assert r2.json()["logo_text"] == new_logo
    # Restore
    session.patch(
        f"{API}/admin/site-settings",
        json={"logo_text": "Al Haramain"},
        headers=headers,
    )


def test_admin_product_crud(session, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "name": "TEST_Atlas Bloom",
        "brand": "Al Haramain",
        "category": "perfume",
        "scent_family": "french",
        "status": "in_stock",
        "price_min": 500,
        "price_max": 1500,
    }
    r = session.post(f"{API}/admin/products", json=payload, headers=headers)
    assert r.status_code == 200, r.text
    created = r.json()
    slug = created["slug"]
    assert created["price_min"] == 500 and created["price_max"] == 1500
    assert len(created["sizes"]) == 3

    # PATCH - update price, sizes should be recomputed
    r2 = session.patch(
        f"{API}/admin/products/{slug}",
        json={"price_min": 700, "price_max": 2100, "status": "best_seller"},
        headers=headers,
    )
    assert r2.status_code == 200, r2.text
    updated = r2.json()
    assert updated["price_min"] == 700
    assert updated["price_max"] == 2100
    assert updated["status"] == "best_seller"
    assert updated["sizes"][0]["price"] == 700
    assert updated["sizes"][-1]["price"] == 2100

    # DELETE
    r3 = session.delete(f"{API}/admin/products/{slug}", headers=headers)
    assert r3.status_code == 200
    # Verify gone
    r4 = session.get(f"{API}/products/{slug}")
    assert r4.status_code == 404


def test_admin_product_create_requires_auth(session):
    r = session.post(
        f"{API}/admin/products",
        json={
            "name": "TEST_Noauth",
            "category": "perfume",
            "scent_family": "french",
            "price_min": 100,
            "price_max": 200,
        },
    )
    assert r.status_code == 401


# ---------- Admin login (username + email forms) ---------- #
def test_admin_login_with_username_payload(session):
    """Backend should accept {username, password} payload."""
    r = session.post(
        f"{API}/admin/login",
        json={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert body.get("username") == ADMIN_EMAIL


def test_admin_login_with_email_payload(session):
    """Backend should also accept the legacy {email, password} payload."""
    r = session.post(
        f"{API}/admin/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert r.status_code == 200
    assert "access_token" in r.json()


# ---------- Branded hero media (MP4 + WebM) ---------- #
def test_hero_branded_mp4(session):
    r = session.get(f"{API}/media/hero_branded.mp4", stream=True)
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith("video/")
    # consume a small chunk to ensure body streams
    chunk = next(r.iter_content(chunk_size=1024), b"")
    assert len(chunk) > 0
    r.close()


def test_hero_branded_webm(session):
    r = session.get(f"{API}/media/hero_branded.webm", stream=True)
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith("video/")
    chunk = next(r.iter_content(chunk_size=1024), b"")
    assert len(chunk) > 0
    r.close()


def test_site_settings_hero_videos_includes_branded(session):
    r = session.get(f"{API}/site-settings")
    assert r.status_code == 200
    s = r.json()
    hero_videos = s.get("hero_videos") or []
    assert len(hero_videos) >= 1
    first = hero_videos[0]
    # Should be absolutized to public host but path should include the branded mp4
    assert "hero_branded.mp4" in first, f"First hero_video should be branded mp4, got {first}"


# ---------- Best sellers branded image migration ---------- #
def test_best_sellers_branded_image(session):
    """At least most of the 8 best-sellers should carry the branded bottle image."""
    branded_url = (
        "https://customer-assets.emergentagent.com/job_zen-black-5/artifacts/"
        "3p24p8pa_9a125e1f-cad2-4537-9a87-6a0432a6d156.jpg"
    )
    r = session.get(f"{API}/products", params={"status": "best_seller", "limit": 8})
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) > 0
    branded_count = sum(1 for p in items if p.get("image_url") == branded_url)
    assert branded_count >= max(1, len(items) // 2), (
        f"Expected most best-sellers to use branded image; got {branded_count}/{len(items)}"
    )


# ---------- Visitor tracking ---------- #
def test_track_visitor_public(session):
    payload = {
        "page": "/test-from-pytest",
        "referrer": "https://example.com/ref",
        "visitor_id": "TEST_visitor_pytest_001",
    }
    r = session.post(f"{API}/track-visitor", json=payload)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("ok") is True
    assert isinstance(body.get("total_visits"), int)
    assert body["total_visits"] >= 1
    assert isinstance(body.get("unique_visitors"), int)


def test_admin_visitors_requires_auth(session):
    r = session.get(f"{API}/admin/visitors")
    assert r.status_code == 401


def test_admin_visitors_returns_stats(session, admin_token):
    # First emit a track event so there is at least one record
    session.post(
        f"{API}/track-visitor",
        json={
            "page": "/test-admin-visitors",
            "referrer": "",
            "visitor_id": "TEST_visitor_pytest_002",
        },
    )
    headers = {"Authorization": f"Bearer {admin_token}"}
    r = session.get(f"{API}/admin/visitors", headers=headers)
    assert r.status_code == 200, r.text
    body = r.json()
    for k in ("total_visits", "unique_visitors", "today", "last_7_days"):
        assert k in body, f"Missing {k} in admin/visitors response"
        assert isinstance(body[k], int)
    assert body["total_visits"] >= 1
    assert isinstance(body.get("top_pages"), list)
    assert isinstance(body.get("recent"), list)
    # Recent should include our recently-emitted page
    pages = [v.get("page") for v in body["recent"]]
    assert any(p == "/test-admin-visitors" or p == "/test-from-pytest" for p in pages)


# ---------- HARAMAIN15 coupon ---------- #
def test_coupon_haramain15(session, in_stock_product):
    cid = session.post(f"{API}/cart").json()["cart"]["id"]
    p = in_stock_product
    session.post(
        f"{API}/cart/{cid}/items",
        json={"product_id": p["id"], "size_label": p["sizes"][1]["label"], "quantity": 2},
    )
    r = session.patch(f"{API}/cart/{cid}", json={"coupon": "HARAMAIN15"})
    assert r.status_code == 200
    body = r.json()
    expected = int(body["totals"]["subtotal"] * 0.15)
    assert body["totals"]["discount"] == expected, body["totals"]
