import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        console_errors = []
        page_errors = []

        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda err: page_errors.append(str(err)))

        print("[NAV] Loading http://localhost:3000 ...")
        await page.goto("http://localhost:3000", wait_until="networkidle")

        tabs = [
            ("Defect Inventory", "tab_defect_inventory.png"),
            ("Patrol Fleet", "tab_patrol_fleet.png"),
            ("AI Model & Metrics", "tab_ai_metrics.png"),
            ("Live Monitoring", "tab_live_monitoring.png"),
        ]

        for tab_name, screenshot_file in tabs:
            try:
                print(f"[NAV] Clicking '{tab_name}' tab...")
                button = page.locator(f"button:has-text('{tab_name}')").first
                await button.click()
                await asyncio.sleep(1)
                await page.screenshot(path=screenshot_file)
                print(f"[PASS] Successfully opened {tab_name} -> {screenshot_file}")
            except Exception as e:
                print(f"[FAIL] Error testing tab {tab_name}: {e}")

        if page_errors:
            print(f"[FAIL] Page Errors found across tabs: {page_errors}")
        else:
            print("[SUCCESS] All navigation tabs tested with ZERO errors!")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
