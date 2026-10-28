# Changelog

## 0.4.0 — 2026-10-28

- Replaced the generic personal meal diary interface with a daily food-record workflow based on the supplied physical form.
- Added center, kitchen contact, date, breakfast and meal counts, menu, water, fruit, and categorized ingredient lines.
- Added dynamic ingredient rows for Desayuno, Fruta y verdura, Abarrotes y desechables, and Carnes y carnes frías.
- Added date-level duplicate confirmation, history search, month filtering, editing, and deletion.
- Added an Excel-compatible SpreadsheetML workbook export with Registros diarios and Concentrado worksheets.
- Added JSON backup download and restore for the new food-log data.
- Added responsive, print-friendly-style form layout and updated project documentation.

## 0.3.0 — 2026-10-27

- Separated data utilities, local storage and exports into JavaScript modules.
- Added edit actions for existing meal records.
- Added history filtering by date range and a clear-filters control.
- Added versioned JSON backup and restore with validation and confirmation.
- Hardened CSV export against common spreadsheet formula prefixes.
- Added storage migration from the previous local key.
- Added keyboard focus handling, reduced-motion support and additional responsive styles.
- Added Node.js unit tests, sample fixtures and GitHub Actions workflow.

## Known limitations

- The new food-log interface uses a separate local-storage key; records from the older personal meal diary are not automatically converted.
- The exported workbook uses SpreadsheetML XML with an `.xls` extension, not binary `.xlsx`.
- The generated layout still needs a real Excel visual check against the supplied physical form and workbook.
- There is no account system, server, cross-device synchronization, or automatic backup.
