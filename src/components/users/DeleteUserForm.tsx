"use client";

import { deleteRegisteredUserAction } from "@/app/admin/usuarios/actions";

type DeleteUserFormProps = {
  userId: string;
  userName: string;
};

export function DeleteUserForm({ userId, userName }: DeleteUserFormProps) {
  return (
    <form
      action={deleteRegisteredUserAction}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Excluir o cadastro de ${userName}? Essa ação remove o acesso do usuário e não pode ser desfeita.`,
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 sm:w-auto"
      >
        Excluir cadastro
      </button>
    </form>
  );
}
