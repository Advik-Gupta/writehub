import { Database, Eye, FileKey, KeyRound, Share2, Trash } from "lucide-react";
import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/config";

interface Note {
  icon: ReactNode;
  title: string;
  body: string;
}

export const PRIVACY_NOTES: Note[] = [
  {
    icon: <KeyRound />,
    title: "Your password never leaves this device",
    body: "It is stretched into a key with 600,000 rounds of PBKDF2 inside your browser. The server only ever receives a derived verifier that cannot be turned back into your password.",
  },
  {
    icon: <FileKey />,
    title: "Your writing is encrypted before it is sent",
    body: "A data key is generated on your device and locked with your password. Document text, titles, outlines, comments, sources and these answers are sealed with AES-256-GCM before they touch the network.",
  },
  {
    icon: <Database />,
    title: "The database holds ciphertext only",
    body: "Anyone with console access to MongoDB sees your email address, timestamps, and the shape of your folder tree. They cannot read a title, a sentence or a tag, because the keys are not stored on the server.",
  },
  {
    icon: <Eye />,
    title: "Search and export run in your browser",
    body: `Full text search, tags, backlinks, compiling and exporting all happen on your machine against decrypted data. ${APP_NAME} cannot index what it cannot read.`,
  },
  {
    icon: <Share2 />,
    title: "Public links are the one readable copy",
    body: "If you publish a document as a public link, that single document is stored in readable form so visitors can open it without an account. Nothing is published unless you ask, and revoking the link deletes the copy.",
  },
  {
    icon: <Trash />,
    title: "Deleting is permanent",
    body: "Deleting your account removes every document, source, comment and image from the database. There is no backup to restore from, and no password reset, so a lost password means the writing is gone for good.",
  },
];

export function PrivacyNotes({ compact }: { compact?: boolean }) {
  return (
    <ul className={compact ? "space-y-4" : "space-y-5"}>
      {PRIVACY_NOTES.map((note) => (
        <li key={note.title} className="flex gap-3">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-bg text-accent [&_svg]:size-3.5">{note.icon}</span>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-fg">{note.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-mute">{note.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
