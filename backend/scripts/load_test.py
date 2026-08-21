"""Al Haramain — throwaway concurrent load test (Phase K).

Simulates 10-30 concurrent GETs against the read-only catalogue endpoints of
an already-running production-mode server. No writes to real data. Reports
latency percentiles and error/lock counts.

Usage:
    python backend/scripts/load_test.py --base-url http://127.0.0.1:8000 --workers 20 --requests 100
"""
from __future__ import annotations

import argparse
import statistics
import threading
import time

import httpx


def worker(base_url: str, endpoints: list[str], n: int, results: list, lock: threading.Lock):
    local = []
    with httpx.Client(timeout=10.0) as client:
        for i in range(n):
            ep = endpoints[i % len(endpoints)]
            t0 = time.perf_counter()
            try:
                r = client.get(base_url + ep)
                dt = time.perf_counter() - t0
                local.append((ep, r.status_code, dt, None))
            except Exception as exc:
                dt = time.perf_counter() - t0
                local.append((ep, None, dt, str(exc)))
    with lock:
        results.extend(local)


def main() -> None:
    parser = argparse.ArgumentParser(description="Load test the Al Haramain catalogue API")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--workers", type=int, default=20, help="Concurrent threads (10-30 recommended)")
    parser.add_argument("--requests", type=int, default=25, help="Requests per worker")
    args = parser.parse_args()

    # First fetch a real slug + asset path so requests hit real data, not 404s.
    with httpx.Client(timeout=10.0) as c:
        one = c.get(f"{args.base_url}/api/catalogue?limit=1").json()
        slug = one["items"][0]["slug"] if one.get("items") else "test"

    endpoints = [
        "/api/catalogue?limit=30",
        "/api/search?q=oud",
        f"/api/catalogue/{slug}",
        f"/assets/products/{slug}/thumb.webp",
    ]

    results: list = []
    lock = threading.Lock()
    threads = [
        threading.Thread(target=worker, args=(args.base_url, endpoints, args.requests, results, lock))
        for _ in range(args.workers)
    ]

    t0 = time.perf_counter()
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    total_time = time.perf_counter() - t0

    latencies = [r[2] for r in results]
    errors = [r for r in results if r[1] is None or r[1] >= 400]
    locked = [r for r in results if r[3] and "lock" in r[3].lower()]

    print(f"Total requests : {len(results)}  ({args.workers} workers x {args.requests} req)")
    print(f"Wall time      : {total_time:.2f}s  ({len(results)/total_time:.1f} req/s)")
    if latencies:
        latencies.sort()
        p50 = statistics.median(latencies)
        p95 = latencies[int(len(latencies) * 0.95) - 1]
        p99 = latencies[int(len(latencies) * 0.99) - 1]
        print(f"Latency p50    : {p50*1000:.1f} ms")
        print(f"Latency p95    : {p95*1000:.1f} ms")
        print(f"Latency p99    : {p99*1000:.1f} ms")
        print(f"Latency max    : {max(latencies)*1000:.1f} ms")
    print(f"Errors (>=400 or exception): {len(errors)} / {len(results)}")
    print(f"SQLite 'database is locked' errors: {len(locked)}")
    if errors[:5]:
        print("Sample errors:", errors[:5])


if __name__ == "__main__":
    main()
