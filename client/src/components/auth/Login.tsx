import { useState } from "react";
import { login } from "../../lib/authApi";
import { setAccessToken } from "../../lib/authToken";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { useNavigate } from "react-router-dom";
import { validateLogin, type LoginFieldErrors } from "../../lib/authValidation";

type TouchedFields = Partial<Record<keyof LoginFieldErrors, boolean>>;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState<TouchedFields>({});
  const { setUser } = useCurrentUser();
  const navigate = useNavigate();

  // Derived: recomputed every render from the current field values.
  const fieldErrors = validateLogin({ email, password });

  const markTouched = (field: keyof LoginFieldErrors) =>
    setTouched((t) => ({ ...t, [field]: true }));

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError("");

    if (Object.keys(fieldErrors).length > 0) {
      // reveal every field's error on a submit attempt
      setTouched({ email: true, password: true });
      return;
    }

    setIsSubmitting(true);
    try {
      const { user, token } = await login({ email, password });
      setAccessToken(token);
      setUser(user);
      navigate("/explore");
    } catch {
      setError("Invalid credentials");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form className="mx-auto flex max-w-sm flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <h1 className="text-xl font-bold text-zinc-950">Log in</h1>

        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => markTouched("email")}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
          {touched.email && fieldErrors.email && (
            <span className="text-xs text-red-600">{fieldErrors.email}</span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => markTouched("password")}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
          {touched.password && fieldErrors.password && (
            <span className="text-xs text-red-600">{fieldErrors.password}</span>
          )}
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
        >
          {isSubmitting ? "Logging in..." : "Log in"}
        </button>
      </form>
    </>
  );
}
