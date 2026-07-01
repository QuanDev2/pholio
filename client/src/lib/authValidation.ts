// Client-side auth form validation. Mirrors the SHAPE rules in the backend
// Zod schemas (server/src/schemas/auth.ts) for fast feedback; the backend stays
// authoritative and owns server-only rules (reserved usernames, uniqueness).

export type LoginFieldErrors = {
  email?: string;
  password?: string;
};

export type RegisterFieldErrors = {
  email?: string;
  username?: string;
  name?: string;
  password?: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Deliberately loose — mirrors loginSchema (email shape + non-empty password).
// Never enforce strength rules on login: it would lock out valid existing accounts.
export function validateLogin({
  email,
  password,
}: {
  email: string;
  password: string;
}): LoginFieldErrors {
  const errors: LoginFieldErrors = {};

  if (!isValidEmail(email)) errors.email = "Enter a valid email address";
  if (!password) errors.password = "Password is required";

  return errors;
}

// Mirrors registerSchema shape rules (length/charset/format).
export function validateRegister({
  email,
  username,
  name,
  password,
}: {
  email: string;
  username: string;
  name: string;
  password: string;
}): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};

  if (!name.trim()) errors.name = "Name is required";

  if (username.length < 6) errors.username = "Username must be at least 6 characters";
  else if (username.length > 20) errors.username = "Username must be at most 20 characters";
  else if (!/^[a-z0-9_-]+$/i.test(username))
    errors.username = "Username can only contain letters, numbers, hyphens, and underscores";

  if (!isValidEmail(email)) errors.email = "Enter a valid email address";

  if (password.length < 8) errors.password = "Password must be at least 8 characters";
  else if (password.length > 72) errors.password = "Password must be at most 72 characters";

  return errors;
}
