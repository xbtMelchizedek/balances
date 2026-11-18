#!/usr/bin/env python3
"""Headless screenshots of the demo screen, using Playwright and system Chrome."""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get("SCREENSHOT_DIR", ROOT / "screenshots-out")).resolve()
PORT = os.environ.get("SCREENSHOT_PORT", "4173")
BASE = f"http://127.0.0.1:{PORT}/"


def wait_for_server(timeout: float = 30.0) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(BASE, timeout=1) as res:
                if 200 <= res.status < 400:
                    return
        except (urllib.error.URLError, TimeoutError):
            time.sleep(0.2)
    raise SystemExit("preview server did not start")


def main() -> int:
    preview = subprocess.Popen(
        ["npm", "run", "preview", "--", "--port", PORT],
        cwd=ROOT,
    )
    try:
        wait_for_server()
        if OUT.exists():
            shutil.rmtree(OUT)
        OUT.mkdir(parents=True)

        with sync_playwright() as p:
            browser = p.chromium.launch(
                channel="chrome",
                args=["--headless=new", "--no-sandbox"],
            )
            desktop = browser.new_context(
                viewport={"width": 1280, "height": 1600},
                device_scale_factor=2,
            )
            page = desktop.new_page()
            page.goto(BASE, wait_until="networkidle")
            page.locator("[data-testid=swap-demo]").wait_for()
            page.screenshot(path=str(OUT / "01-flop-hype-desktop.png"), full_page=True)

            page.get_by_role("button", name="Connect demo wallet").click()
            page.get_by_test_id("primary-action").click()
            page.get_by_test_id("quote-card").wait_for()
            page.screenshot(path=str(OUT / "02-review-quote.png"), full_page=True)

            page.get_by_test_id("token-select-pay-opener").click()
            page.get_by_test_id("token-search").wait_for()
            page.screenshot(path=str(OUT / "03-token-picker.png"), full_page=True)
            page.keyboard.press("Escape")

            page.get_by_test_id("slippage-toggle").click()
            page.locator(".slippage__label").wait_for()
            page.screenshot(path=str(OUT / "04-slippage-settings.png"), full_page=True)
            page.get_by_test_id("slippage-toggle").click()

            page.get_by_test_id("expire-quote").click()
            page.get_by_test_id("stale-banner").wait_for()
            page.screenshot(path=str(OUT / "05-stale-quote.png"), full_page=True)
            page.get_by_test_id("refresh-quote").click()
            page.get_by_test_id("quote-timer").wait_for()

            amount = page.get_by_label("Pay with amount")
            amount.fill("5000")
            page.get_by_test_id("error-state").wait_for()
            page.screenshot(path=str(OUT / "06-insufficient-balance.png"), full_page=True)
            amount.fill("25")

            page.get_by_role("tab", name="FLOP ⇄ meme").click()
            page.get_by_test_id("token-select-receive").wait_for()
            page.screenshot(path=str(OUT / "07-flop-meme.png"), full_page=True)
            browser.close()

            mobile_browser = p.chromium.launch(
                channel="chrome",
                args=["--headless=new", "--no-sandbox"],
            )
            mobile = mobile_browser.new_context(
                viewport={"width": 390, "height": 844},
                device_scale_factor=3,
                is_mobile=True,
                has_touch=True,
            )
            mpage = mobile.new_page()
            mpage.goto(BASE, wait_until="networkidle")
            mpage.locator("[data-testid=swap-demo]").wait_for()
            mpage.screenshot(path=str(OUT / "08-mobile.png"), full_page=True)
            mobile_browser.close()

        print(f"wrote screenshots to {OUT}")
        return 0
    finally:
        preview.terminate()
        try:
            preview.wait(timeout=5)
        except subprocess.TimeoutExpired:
            preview.kill()


if __name__ == "__main__":
    sys.exit(main())
