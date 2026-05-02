"use client";

interface Props {
  action: () => Promise<void>;
}

export default function DeleteSleeveButton({ action }: Props) {
  return (
    <form
      action={action}
      onSubmit={(e) => { if (!confirm("Eliminare questa bustina?")) e.preventDefault(); }}
      className="flex-1"
    >
      <button type="submit" className="btn-danger w-full">Elimina</button>
    </form>
  );
}
