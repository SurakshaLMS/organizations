# ✅ Lecture Documents API - Fixed!

## Problem
**Updating lectures didn't return documents in the response**

## Solution
✅ Fixed `updateLectureWithDocuments` to fetch and return **all documents**

## Test It

```bash
curl -X PUT "http://localhost:3000/organization/api/v1/lectures/10/with-files" \
  -F "title=Updated Lecture" \
  -F "documents=@file.pdf"
```

## Response Now Includes

```json
{
  "lectureId": "10",
  "title": "Updated Lecture",
  "documents": [
    // ✅ ALL documents (including newly uploaded)
  ],
  "uploadedDocuments": [
    // Info about newly uploaded files
  ],
  "totalDocuments": 5,
  "newDocumentsCount": 1,
  "message": "Lecture updated successfully with 1 new documents"
}
```

## Restart App

```powershell
npm run start:dev
```

Then test! 🚀
