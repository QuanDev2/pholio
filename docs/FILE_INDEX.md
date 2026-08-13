# File Index — generated 2026-08-13

### src/
- `App.tsx` — App (default)
- `main.tsx`
- `types.ts` — PhotoStatus, Photo, PhotoMetaData, User, PostAuthor, Post

### src/component/
- `Navbar.tsx` — Navbar (default)
- `UserMenu.tsx` — UserMenu (default)

### src/components/
- `Portfolio.tsx` — Portfolio (default)
- `SearchInput.tsx` — SearchInput (default)
- `SortDropdown.tsx` — SortDropdown (default)
- `TagFilters.tsx` — TagFilters (default)
- `index.ts`

### src/components/auth/
- `Login.tsx` — Login (default)
- `Register.tsx` — Register (default)

### src/components/editor/
- `Editor.tsx` — Editor (default)
- `NewPostRedirect.tsx` — NewPostRedirect (default)
- `PhotoUploadZone.tsx` — PhotoUploadZone (default), PendingUpload
- `SavedPhotoTile.tsx` — SavedPhotoTile (default)
- `UploadItem.tsx` — UploadItem (default)

### src/components/posts/
- `Lightbox.tsx` — Lightbox (default)
- `Post.tsx` — Post (default)
- `PostCard.tsx` — PostCard (default)
- `PostFeed.tsx` — PostFeed (default)
- `postFilterReducer.ts` — SortOrder, FilterState, FilterAction, initialState, filterReducer

### src/context/
- `CurrentUserContext.tsx` — CurrentUserProvider, useCurrentUser

### src/hooks/
- `usePostFilter.ts` — usePostFilter (default)
- `useUpload.ts` — useUpload (default), validateFile

### src/lib/
- `apiClient.ts` — api
- `authApi.ts`
- `authToken.ts` — getAccessToken, setAccessToken
- `authValidation.ts` — LoginFieldErrors, RegisterFieldErrors, validateLogin, validateRegister
- `postsApi.ts`
