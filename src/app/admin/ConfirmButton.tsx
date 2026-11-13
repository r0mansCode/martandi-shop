"use client";

/** Submit button that asks for confirmation first; for actions that can't be undone. */
export function ConfirmButton({
  confirm,
  className,
  children,
}: {
  confirm: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
