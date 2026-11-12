import { ViewSwitch } from "./ViewSwitch";

export function Nav() {
  return (
    <header>
      <h1>GTech City</h1>
      <ViewSwitch current="catalogue" />
    </header>
  );
}
