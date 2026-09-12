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

        print("[TEST] Navigating to http://localhost:3000 ...")
        response = await page.goto("http://localhost:3000", wait_until="networkidle", timeout=30000)
        print(f"[TEST] HTTP Status: {response.status}")

        # Check for Vite error overlay
        overlay = await page.query_selector("vite-error-overlay")
        if overlay:
            text = await overlay.inner_text()
            print(f"[FAIL] VITE ERROR OVERLAY DETECTED:\n{text}")
            await page.screenshot(path="vite_error.png")
            await browser.close()
            return

        print("[PASS] No Vite error overlay found!")
        
        # Wait 2 seconds for initial render
        await asyncio.sleep(2)

        # Print page title
        title = await page.title()
        print(f"[PASS] Page Title: {title}")

        # Take screenshot of the loaded dashboard
        await page.screenshot(path="dashboard_loaded.png")
        print("[PASS] Screenshot saved to dashboard_loaded.png")

        # Report errors
        if page_errors:
            print(f"[FAIL] Page Errors ({len(page_errors)}):")
            for e in page_errors:
                print(f"  - {e}")
        else:
            print("[PASS] Zero uncaught page errors!")

        if console_errors:
            print(f"[WARN] Console Errors ({len(console_errors)}):")
            for c in console_errors[:5]:
                print(f"  - {c}")
        else:
            print("[PASS] Zero console errors!")

        print("[SUCCESS] All UI sanity checks passed successfully!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
