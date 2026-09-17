/**
 * Logs one row (timestamp) per print/PDF-export click from the Promotion tool.
 *
 * Setup:
 * 1. Open (or create) the Google Sheet you want entries logged into.
 * 2. Extensions > Apps Script. Delete any starter code and paste this file's contents.
 * 3. Change SHEET_NAME below if your tab isn't named "Log".
 * 4. Deploy > New deployment > type "Web app".
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the deployed Web app URL and set it as VITE_SHEET_LOG_URL
 *    (in .env.local for local dev, and as the SHEET_LOG_URL repo secret
 *    for the GitHub Actions deploy — see deploy-pages.yml).
 * 6. Whenever you edit this script, redeploy (Deploy > Manage deployments >
 *    edit > New version) — the Web app URL stays the same.
 */

const SHEET_NAME = 'Log'

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
    || SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_NAME)

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp (KST)'])
  }

  let timestamp = new Date()
  try {
    const body = JSON.parse(e.postData.contents)
    if (body.timestamp) timestamp = new Date(body.timestamp)
  } catch (err) {
    // no/invalid body — fall back to server time
  }

  sheet.appendRow([Utilities.formatDate(timestamp, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss')])

  return ContentService.createTextOutput('OK')
}
