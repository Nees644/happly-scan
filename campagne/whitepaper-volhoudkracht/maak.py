import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page()
        await pg.goto('file:///tmp/claude-0/-home-claude/e80a6dfb-446e-5b48-953b-d08f8f3ca825/scratchpad/whitepaper/volhoudkracht.html')
        await pg.wait_for_timeout(600)
        await pg.pdf(path='Happly_whitepaper_Volhoudkracht.pdf', format='A4', print_background=True, prefer_css_page_size=True,
                     display_header_footer=True, header_template='<div></div>',
                     footer_template='<div style="width:100%;font-family:Helvetica,Arial,sans-serif;font-size:7.5pt;color:#6B6472;padding:0 20mm;display:flex;justify-content:space-between"><span>Happly · Volhoudkracht</span><span class="pageNumber"></span></div>')
        await b.close()
asyncio.run(main())
