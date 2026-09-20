"use client";

import { useEffect, useState } from "react";
import { useUI, type DialogState } from "@/lib/store";
import { Dialog } from "../ui";
import { CiteForm } from "./CiteDialog";
import { CommandPalette } from "./CommandPalette";
import { CompileForm } from "./CompileDialog";
import { ReferenceList } from "./ReferenceListDialog";
import { SettingsForm } from "./SettingsDialog";
import { ShareForm } from "./ShareDialog";
import { SourceForm } from "./SourceDialog";

type Kind = NonNullable<DialogState>["type"];

export function Dialogs() {
  const dialog = useUI((s) => s.dialog);
  const [last, setLast] = useState<DialogState>(dialog);
  useEffect(() => {
    if (dialog) setLast(dialog);
  }, [dialog]);

  const shown = dialog ?? last;
  const close = () => useUI.setState({ dialog: null });
  const is = (kind: Kind) => dialog?.type === kind;
  const props = <K extends Kind>(kind: K) => (shown?.type === kind ? (shown as Extract<DialogState, { type: K }>) : null);

  const source = props("source");

  return (
    <>
      <Dialog open={is("palette")} onClose={close} title="Search" bare width={640}>
        <CommandPalette onClose={close} />
      </Dialog>
      <Dialog open={is("compile")} onClose={close} title="Compile" description="Stitch a folder's documents into one manuscript." width={620}>
        <CompileForm folderId={props("compile")?.folderId} onClose={close} />
      </Dialog>
      <Dialog open={is("share")} onClose={close} title="Share & export">
        {props("share") && <ShareForm docId={props("share")!.docId} />}
      </Dialog>
      <Dialog open={is("source")} onClose={close} title={source?.sourceId ? "Edit source" : "Add source"} width={560}>
        <SourceForm sourceId={source?.sourceId} attachTo={source?.attachTo} onClose={close} />
      </Dialog>
      <Dialog open={is("cite")} onClose={close} title="Insert citation" width={520}>
        <CiteForm sourceId={props("cite")?.sourceId} onClose={close} />
      </Dialog>
      <Dialog open={is("references")} onClose={close} title="Reference list" width={640}>
        {props("references") && <ReferenceList docId={props("references")!.docId} />}
      </Dialog>
      <Dialog open={is("settings")} onClose={close} title="Settings" width={560}>
        <SettingsForm />
      </Dialog>
    </>
  );
}
