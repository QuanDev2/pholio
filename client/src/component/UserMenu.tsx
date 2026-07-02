import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentUser } from "../context/CurrentUserContext";

export default function UserMenu() {
  const { user, logout } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the menu when clicking anywhere outside it.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-sm font-medium text-zinc-700 hover:text-zinc-900"
      >
        @{user.username}
        <span className="text-xs text-zinc-400">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-44 rounded-md border border-zinc-200 bg-white py-1 shadow-lg">
          <Link
            to={`/user/${user.username}`}
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            My Portfolio
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
