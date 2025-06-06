import puppeteer, { Page } from "puppeteer"
import path from "path"
import fs from "fs/promises"

const BASE_URL = "https://challenge.sunvoy.com"
const EMAIL = "demo@example.org"
const PASSWORD = "test"
const COOKIE_PATH = path.resolve(__dirname, "../cookies.json")

async function saveCookies(page: Page) {
  const cookies = await page.cookies()
  await fs.writeFile(COOKIE_PATH, JSON.stringify(cookies, null, 2))
}

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle0" })
  await page.type('input[name="username"]', EMAIL)
  await page.type('input[name="password"]', PASSWORD)
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: "networkidle0" }),
  ])
  saveCookies(page)
}

async function main() {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  await page.goto(BASE_URL, { waitUntil: "networkidle0" })

  await login(page)

  await browser.close()
}

main().catch((err) => {
  console.error("Script failed ", err)
  process.exit(1)
})
