import { Routes, Route, Link, Navigate } from "react-router-dom";
import PostFeed from "./components/posts/PostFeed";
import { CurrentUserProvider, useCurrentUser } from "./context/CurrentUserContext";
import Post from "./components/posts/Post";
import Navbar from "./component/Navbar";
import Portfolio from "./components/Portfolio";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <Navbar></Navbar>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useCurrentUser();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CurrentUserProvider>
        <Routes>
          <Route
            path="/"
            element={
              <Layout>
                <div className="flex flex-col items-center gap-6 py-12 text-center md:py-24">
                  <h1 className="text-2xl font-bold text-zinc-950 md:text-4xl">pholio</h1>
                  <p className="max-w-md text-zinc-500">
                    A home for photographers to share their work.
                  </p>
                  <Link
                    to="/explore"
                    className="rounded-md bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600"
                  >
                    Explore Portfolios
                  </Link>
                </div>
              </Layout>
            }
          />

          <Route
            path="/explore"
            element={
              <Layout>
                <PostFeed />
              </Layout>
            }
          />

          <Route
            path="/user/:username"
            element={
              <Layout>
                <Portfolio />
              </Layout>
            }
          ></Route>

          <Route
            path="/posts/:slug"
            element={
              <Layout>
                <Post />
              </Layout>
            }
          />
          <Route
            path="/login"
            element={
              <Layout>
                <Login />
              </Layout>
            }
          />
          <Route
            path="/register"
            element={
              <Layout>
                <Register />
              </Layout>
            }
          />
          <Route
            path="/editor"
            element={
              <ProtectedRoute>
                <Layout>
                  <div>Editor (stub)</div>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/editor/:postId"
            element={
              <ProtectedRoute>
                <Layout>
                  <div>Post editor (stub)</div>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </CurrentUserProvider>
    </QueryClientProvider>
  );
}

export default App;
