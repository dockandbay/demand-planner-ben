/**
 * Pull Coghlans (AU 3PL) weekly invoice attachments into a Drive folder.
 *
 * What it does:
 *   - Searches Gmail for the weekly Coghlans invoice emails
 *     (from accounts.receivable@coghlan.com.au, subject "Coghlan Invoice DOK...").
 *   - Saves every .xlsx attachment into a Drive folder "Coghlans invoice back analysis".
 *   - Skips files already saved, so it is safe to re-run each week.
 *
 * How to use (one-off):
 *   1. Go to https://script.google.com  ->  New project.
 *   2. Delete the placeholder code, paste this whole file in, Save.
 *   3. Press Run (select function: pullCoghlans). Authorise when prompted.
 *   4. When it finishes, open the "Execution log" (View -> Logs) to see the count.
 *   5. In Google Drive, open the folder "Coghlans invoice back analysis",
 *      then either bulk-download it (right-click folder -> Download = a .zip),
 *      OR tell Ben it's ready and Claude will pull the files from Drive directly.
 */

// Only pull invoices dated on/after this (yyyy/mm/dd). Feb 2026 = full history.
var AFTER_DATE = '2026/02/01';
var DRIVE_FOLDER = 'Coghlans invoice back analysis';
var SENDER = 'accounts.receivable@coghlan.com.au';

function pullCoghlans() {
  var folder = getOrCreateFolder_(DRIVE_FOLDER);

  // Build a set of filenames already in the folder so re-runs are idempotent.
  var existing = {};
  var it = folder.getFiles();
  while (it.hasNext()) existing[it.next().getName()] = true;

  var query = 'from:' + SENDER + ' subject:(Coghlan Invoice) after:' + AFTER_DATE;
  var threads = GmailApp.search(query, 0, 200);

  var saved = 0, skipped = 0, scanned = 0;
  for (var t = 0; t < threads.length; t++) {
    var msgs = threads[t].getMessages();
    for (var m = 0; m < msgs.length; m++) {
      var atts = msgs[m].getAttachments();
      for (var a = 0; a < atts.length; a++) {
        var att = atts[a];
        var name = att.getName() || '';
        // xlsx only (each email also carries a .pdf we don't need)
        if (!/\.xlsx$/i.test(name)) continue;
        scanned++;
        if (existing[name]) { skipped++; continue; }
        folder.createFile(att.copyBlob()).setName(name);
        existing[name] = true;
        saved++;
      }
    }
  }

  Logger.log('Coghlans pull complete.');
  Logger.log('Threads matched: ' + threads.length);
  Logger.log('xlsx attachments seen: ' + scanned);
  Logger.log('Saved (new): ' + saved);
  Logger.log('Skipped (already there): ' + skipped);
  Logger.log('Drive folder: ' + folder.getUrl());
}

function getOrCreateFolder_(name) {
  var it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}
