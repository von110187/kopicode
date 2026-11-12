import { Link } from "@tanstack/react-router";
import { DEFAULT_SEARCH } from "~/org/search";

export function Nav() {
  return (
    <header>
      <h1>GTech City</h1>
      <nav>
        <Link to="/" activeOptions={{ exact: true }}>
          Catalogue
        </Link>
        <Link to="/org" search={DEFAULT_SEARCH} activeOptions={{ includeSearch: false }}>
          Organisation
        </Link>
        {/* The city draws into the whole document, so it is entered with a full page load. */}
        <a className="cta" href="/city">
          3D city
        </a>
      </nav>
    </header>
  );
}
