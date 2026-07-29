type UserRoleSelectProps = {
  name?: string;
  defaultValue?: string | null;
};

const roleLabels: Record<string, string> = {
  CONSULTANT: "Consultor",
  MANAGER: "Gerente",
  REGIONAL_MANAGER: "Superintendente",
};

export function getRoleLabel(role: string | null | undefined): string {
  if (!role) {
    return "Não informado";
  }

  return roleLabels[role] ?? role;
}

export function UserRoleSelect({
  name = "role",
  defaultValue,
}: UserRoleSelectProps) {
  return (
    <label className="block w-full" htmlFor={name}>
      <span className="mb-2 block text-sm font-medium text-slate-800">
        Perfil final
      </span>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? "CONSULTANT"}
        className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
        required
      >
        <option value="CONSULTANT">Consultor</option>
        <option value="MANAGER">Gerente</option>
        <option value="REGIONAL_MANAGER">Superintendente</option>
      </select>
    </label>
  );
}
