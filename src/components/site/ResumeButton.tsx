"use client";

import { useState } from "react";
import { ArrowUpRight, Download } from "@/components/ui/Icons";
import Modal from "@/components/ui/Modal";
import { track } from "@/lib/analytics";

type Props = {
  url: string;
  label?: string;
  className?: string;
  iconSize?: number;
  onOpen?: () => void;
};

/**
 * Résumé button. On larger screens it previews the PDF in a dialog with download options;
 * on phones (where embedded PDFs work poorly) and without JavaScript it simply downloads.
 */
export default function ResumeButton({ url, label = "Résumé", className = "button button-primary", iconSize = 16, onOpen }: Props) {
  const [open, setOpen] = useState(false);
  const fileName = decodeURIComponent(url.split("/").pop() || "resume.pdf");

  return (
    <>
      <a
        href={url}
        download
        className={className}
        onClick={(e) => {
          track("cv_download");
          if (window.matchMedia("(max-width: 720px)").matches) return; // let phones download
          e.preventDefault();
          onOpen?.();
          setOpen(true);
        }}
      >
        <Download size={iconSize} />
        {label}
      </a>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Résumé"
        description={fileName}
        size="xl"
        flush
        footer={
          <>
            <a className="button button-secondary button-sm" href={url} target="_blank" rel="noreferrer">
              Open in new tab <ArrowUpRight size={14} />
            </a>
            <a className="button button-primary button-sm" href={url} download>
              <Download size={15} /> Download PDF
            </a>
          </>
        }
      >
        <iframe className="resume-frame" src={`${url}#view=FitH`} title="Résumé preview" />
      </Modal>
    </>
  );
}
