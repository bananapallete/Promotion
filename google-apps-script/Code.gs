/**
 * Logs one row (timestamp + event type) per page visit and per print/PDF-
 * export click from the Promotion tool, so visit count and print count can
 * be compared.
 *
 * Setup:
 * 1. script.google.com > New project (doesn't need to be opened from inside
 *    the Sheet — SHEET_ID below targets it directly either way).
 * 2. Delete any starter code and paste this file's contents.
 * 3. Change SHEET_ID/SHEET_NAME below if you're pointing at a different
 *    sheet or tab.
 * 4. Select the `test` function in the function dropdown next to Run, then
 *    click Run once. Google will prompt for authorization — approve it
 *    (Advanced > Go to project (unsafe) is expected for a personal script).
 *    This step is required: without it, the deployed web app silently fails
 *    on every external request.
 * 5. Deploy > New deployment > type "Web app".
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the deployed Web app URL and set it as VITE_SHEET_LOG_URL
 *    (in .env.local for local dev, and as the SHEET_LOG_URL repo secret
 *    for the GitHub Actions deploy — see deploy-pages.yml).
 * 7. Whenever you edit this script, redeploy (Deploy > Manage deployments >
 *    edit > New version) — the Web app URL stays the same.
 *
 * If you already had this script deployed from before the Type column was
 * added: existing rows just won't have a Type value — no migration needed,
 * new rows will fill it in going forward.
 */

const SHEET_ID = '1ucuKXKA8MM8Nh8Oas9Htfef-sKX80A9Fxl2gMlnvncU'
const SHEET_NAME = 'Log'

function doPost(e) {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID)
  const sheet = spreadsheet.getSheetByName(SHEET_NAME)
    || spreadsheet.insertSheet(SHEET_NAME)

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp (KST)', 'Type'])
  }

  let timestamp = new Date()
  let type = 'print'
  try {
    const body = JSON.parse(e.postData.contents)
    if (body.timestamp) timestamp = new Date(body.timestamp)
    if (body.type) type = body.type
  } catch (err) {
    // no/invalid body — fall back to server time and default type
  }

  sheet.appendRow([Utilities.formatDate(timestamp, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'), type])

  return ContentService.createTextOutput('OK')
}

// Run this once manually from the editor to grant Sheets access before deploying.
function test() {
  doPost({ postData: { contents: JSON.stringify({ type: 'visit', timestamp: new Date().toISOString() }) } })
}
