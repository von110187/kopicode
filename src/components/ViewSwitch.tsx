// One control, the same on every page, for which view of the company is shown.
// The 3D city draws into the whole document, so a change of view is a page load.
export type View = "org" | "city" | "catalogue";

const VIEWS: { id: View; name: string; href: string }[] = [
  { id: "org", name: "People, by domain", href: "/org" },
  { id: "city", name: "Projects, in 3D", href: "/city" },
  { id: "catalogue", name: "Catalogue", href: "/" },
];

export function ViewSwitch({ current }: { current: View }) {
  return (
    <label className="view-switch">
      <span>View</span>
      <select
        id="view"
        value={current}
        onChange={(e) => {
          const to = VIEWS.find((v) => v.id === e.target.value);
          if (to && to.id !== current) window.location.assign(to.href);
        }}
      >
        {VIEWS.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
    </label>
  );
}
