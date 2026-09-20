# WriteHub

An encrypted writing workspace for long form work. A rich text editor with Google Docs parity, a Scrivener style binder, an essay inspector with goals and citations, and exports that let the writing leave the app.

Everything you write is encrypted in your browser before it is stored. The database holds ciphertext only.

Deployement = https://writehub-gray.vercel.app/login

## Running it

```bash
cp .env.example .env
npm install
npm run dev
```

Fill in `.env` before the first run:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `MONGODB_DB` | Database name, defaults to `writehub` |
| `SESSION_SECRET` | Signing key for session cookies, use `openssl rand -hex 32` |
| `SESSION_TTL_DAYS` | How long a session cookie lasts |
| `NEXT_PUBLIC_APP_NAME` | Name shown in the interface |
| `NEXT_PUBLIC_APP_URL` | Public URL used for share links |
| `NEXT_PUBLIC_KDF_ITERATIONS` | PBKDF2 rounds used to derive keys, default 600000 |

The app is desktop only. Narrow screens get a notice instead of the editor.

## How the encryption works

1. Your password is stretched in the browser with PBKDF2 SHA-256 at 600,000 iterations. The result is split into a wrapping key and an auth verifier.
2. Only the verifier reaches the server, where it is stored salted and hashed with scrypt. The password itself never leaves your device.
3. A random AES-256-GCM data key is generated on your device at signup and encrypted with the wrapping key. The server stores that sealed blob and cannot open it.
4. Document text, titles, outlines, synopses, comments, sources, collections, images and your signup answers are encrypted with the data key before upload.
5. The data key lives in memory and in `sessionStorage` for the current tab. Locking or signing out wipes it.

What an operator with database access can see: your email address, row timestamps, the shape of your folder tree, and the size of each encrypted blob. What they cannot see: any title, sentence, tag, comment or image.

Consequences worth knowing:

- Search, tags, backlinks, compiling and exporting run in the browser against decrypted data, because the server cannot read your text.
- A public share link stores one readable copy of that single document so visitors can open it without an account. Nothing is published unless you ask, and revoking the link deletes the copy.
- Adding a source by URL sends that URL to the server, which fetches the page to read its title and author.
- There is no password reset. Losing the password means losing the data.
- Deleting your account removes every row belonging to it. No backups are kept.

## Locking

Set an app password on the account page to lock the workspace without signing out. Auto lock runs after 5, 15 or 60 minutes of no activity, or never. When it locks, the key is wiped from memory and unlocking needs either the app password or the account password.

## The editor

Bold, italic, underline, strikethrough, text and highlight colour, H1 to H3, blockquote, inline and fenced code, ordered, bulleted and nested lists, checklists, tables with row and column edits and cell merging, links with a hover card, drag resizable and alignable images, undo and redo, find and replace, and live statistics.

Markdown shortcuts work while typing: `## `, `- `, `1. `, `> `, ``` ``` ```, `- [ ] `. Type `/` for the block menu, `[[` to link a document, `#` to tag.

| Shortcut | Action |
| --- | --- |
| `⌘P` | Search documents, sources, tags, commands |
| `⌥⌘N` | New document |
| `⌥⌘\` | Split view |
| `⌥⌘G` | Corkboard |
| `⌥⌘B` and `⌥⌘R` | Binder and inspector |
| `⌘K`, `⌘F`, `⌥⌘M` | Link, find and replace, comment |

## Structure

**Binder**: projects, folders and documents in a tree you can drag to reorder or reparent. Every project has a Manuscript folder, a Research folder for notes that are not meant to be published, and a Trash. Deleting once moves to trash, deleting again purges, restoring puts it back where it was.

**Split view**: two panes side by side. Open the same document in both and the editors stay in sync as you type.

**Corkboard**: a folder shown as index cards with editable synopses. Drag to reorder chapters before touching the prose.

**Compile**: pick a folder, choose which documents and in what order, and get one Markdown, HTML or text file, or a new document in the project. Footnotes renumber across the whole compilation.

## Thinking tools

- **Outline**: headings fill in automatically with checkboxes, and you can add manual topics that do not map to headings.
- **Insights**: word goal with a progress ring, plus pages, words, characters, paragraphs, outline topics and reading time.
- **References**: add a source by pasting a link or by hand. Tabs for this essay, the whole library, and collections. Inserting a citation drops a numbered footnote, and the reference list is built in MLA, APA or Chicago.
- **Comments**: select text, press `⌥⌘M`, and a badge appears in the margin tied to that selection.
- **Links and tags**: `[[wiki links]]` with backlinks, `#tags` across every project, and full text search.

## Stack

Next.js 15 App Router, React 19, TypeScript, Tailwind v4, Tiptap 3, MongoDB, TanStack Query, Zustand, Motion, Radix.
