// Modal.tsx
// Generic modal/popup. Parent controls isOpen; passes onClose for the close events.
// Content goes in as children.

import type { ReactNode } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
};

function Modal({ isOpen, onClose, children, title }: Props) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#2a3439",
          color: "#eee",
          borderRadius: "8px",
          padding: "20px",
          minWidth: "320px",
          maxWidth: "90vw",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <h2 style={{ margin: 0 }}>{title ?? ""}</h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              lineHeight: 1,
            }}
            aria-label="close"
          >
            x
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
