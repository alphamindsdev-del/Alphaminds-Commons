# Todo List

## Issue 1: Images not showing for wellnessclinic and health record card inside alphabody
- [x] Fixed `getMediaUrl` function in `src/lib/utils.ts` to use relative paths when `VITE_API_BASE_URL` is empty (production), so media URLs are correctly resolved from the worker origin
- [ ] Verify that uploaded images are being stored with correct `media_r2_key` in the database

## Issue 2: "Real Fire Admin" not taking users to the Real Fire admin page
- [x] Fixed `AdminRealFi.tsx` to fetch handoff JWT from `/v1/auth/relfi-handoff` before navigating to `/rel-fi/admin?handoff=`
- [x] Added `embedLogin()` function to Rel-Fi game API to verify handoff and provision admin role
- [x] Updated Rel-Fi game's `admin.tsx` route to handle handoff token on mount
- [x] Fixed admin role check to handle null user case

## Issue 3: D1_TYPE_ERROR returns (active investigation)
- [ ] Continue investigating the Date object serialization issue in audit logs