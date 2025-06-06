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

async function loadCookiesIfAvailable(page: Page) {
  const ifCookiesExists = await fs
    .stat(COOKIE_PATH)
    .then(() => true)
    .catch(() => false)
  if (ifCookiesExists) {
    const cookiesStr = await fs.readFile(COOKIE_PATH, "utf-8")
    const cookies = JSON.parse(cookiesStr)
    await page.setCookie(...cookies)
  }
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

async function fetchInternalAPI(page: Page, endpoint: string, payload?: any) {
  return await page.evaluate(
    async (endpoint, payload) => {
      const res = await fetch(endpoint, {
        headers: {
          Accept: "application/json",
        },
        method: "POST",
        ...(payload && { body: payload }),
      })
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const contentType = res.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Expected JSON response but got ${contentType}`)
      }
      return await res.json()
    },
    endpoint,
    payload
  )
}

async function main() {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  await loadCookiesIfAvailable(page)
  await page.goto(BASE_URL, { waitUntil: "networkidle0" })

  const isLoggedIn = await page.evaluate(() => {
    return !!document.querySelector('a[href="/settings"]')
  })

  if (!isLoggedIn) {
    await login(page)
  }

  await page.goto(`${BASE_URL}/list`, { waitUntil: "networkidle0" })

  try {
    const users = await fetchInternalAPI(page, `${BASE_URL}/api/users`)
    await fs.writeFile("users.json", JSON.stringify(users, null, 2))
  } catch (error) {
    console.error("Failed to fetch users:", error)
    throw error
  }

  await browser.close()
}

main().catch((err) => {
  console.error("Script failed ", err)
  process.exit(1)
})
