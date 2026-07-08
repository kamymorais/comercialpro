import type { ManagerOption } from "@/services/user.service";

type ManagerSelectProps = {
  managers: ManagerOption[];
  name?: string;
  defaultValue?: string | null;
  required?: boolean;
};

export function ManagerSelect({
  managers,
  name = "managerId",
  defaultValue,
  required = false,
}: ManagerSelectProps) {
  return (
    <label className="block w-full" htmlFor={name}>
      <span className="mb-2 block text-sm font-medium text-slate-800">
        Gerente responsável
      </span>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
      >
        <option value="">Selecione um gerente</option>
        {managers.map((manager) => (
          <option key={manager.id} value={manager.id}>
            {manager.fullName} ({manager.username})
          </option>
        ))}
      </select>
    </label>
  );
}
