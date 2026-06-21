import { Link, NavLink } from "react-router-dom";
import { useCurrentUser } from "../context/CurrentUserContext";

export default function Navbar() {
  const { user } = useCurrentUser();

  return (
    <div>
      <nav className="border-b border-zinc-200 bg-white px-4 py-4 flex items-center justify-between sm:px-6">
        <Link to="/" className="font-bold text-teal-700">
          pholio
        </Link>
        <div className="flex items-center gap-6">
          <NavLink
            to="/explore"
            className={({ isActive }) =>
              isActive
                ? "text-sm font-medium text-teal-700"
                : "text-sm font-medium text-zinc-500 hover:text-zinc-900"
            }
          >
            Explore
          </NavLink>
          {user && (
            <NavLink
              to={`/user/${user.username}`}
              className={({ isActive }) =>
                isActive
                  ? "text-sm font-medium text-teal-700"
                  : "text-sm font-medium text-zinc-500 hover:text-zinc-900"
              }
            >
              My Portfolio
            </NavLink>
          )}
        </div>
        {user && (
          <Link
            to="/editor"
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-600"
          >
            Create Post
          </Link>
        )}
      </nav>
    </div>
  );
}
