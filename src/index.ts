import puppeteer, { Page } from "puppeteer"
import path from "path"
import fs from "fs/promises"

const BASE_URL = "https://challenge.sunvoy.com"
const EMAIL = "demo@example.org"
const PASSWORD = "test"
const COOKIE_PATH = path.resolve(__dirname, "../cookies.json")
const USERS_PATH = path.resolve(__dirname, "../users.json")

const keyMapping = {
  "User ID": "id",
  "First Name": "firstName",
  "Last Name": "lastName",
  Email: "email",
}

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

async function fetchInternalAPI(page: Page, endpoint: string) {
  return await page.evaluate(async (endpoint) => {
    const res = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
      },
      method: "POST",
    })
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }
    const contentType = res.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(`Expected JSON response but got ${contentType}`)
    }
    return await res.json()
  }, endpoint)
}

async function getCurrentUser(page: Page) {
  await page.goto(`${BASE_URL}/settings`, { waitUntil: "networkidle0" })

  let currentUser: Record<string, string> = {}
  const result = await page.evaluate((keyMapping) => {
    const formEle = document.querySelector("form")
    if (!formEle) return null

    return Array.from(formEle.children).map((ele) => {
      return {
        [keyMapping[
          ele.querySelector("label")?.textContent as keyof typeof keyMapping
        ]]: ele.querySelector("input")?.value as string,
      }
    })
  }, keyMapping)

  if (!result) return null

  result.forEach((user) => {
    currentUser = { ...currentUser, ...user }
  })

  return currentUser
}

async function main() {
  console.log("Web scraping started...")
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  await loadCookiesIfAvailable(page)
  await page.goto(BASE_URL, { waitUntil: "networkidle0" })

  const isLoggedIn = await page.evaluate(() => {
    return !!document.querySelector('a[href="/settings"]')
  })

  if (!isLoggedIn) {
    console.log("Logging in user...")
    await login(page)
    console.log("User logged in.")
  }

  await page.goto(`${BASE_URL}/list`, { waitUntil: "networkidle0" })

  try {
    console.log("Fetching user list...")
    const users = await fetchInternalAPI(page, `${BASE_URL}/api/users`)
    console.log("Fetching loggedin user details...")
    const currentUser = await getCurrentUser(page)
    const combinedUsers = [...users, currentUser]
    console.log("Writting users to file...")
    await fs.writeFile(USERS_PATH, JSON.stringify(combinedUsers, null, 2))
    console.log("Users list written to file successfully.")
  } catch (error) {
    console.error("Failed to fetch users:", error)
    throw error
  }

  console.log("Check users.json file for the list of users.")
  await browser.close()
}

main().catch((err) => {
  console.error("Script failed ", err)
  process.exit(1)
})
