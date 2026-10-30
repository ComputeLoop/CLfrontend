import { useState } from "react";
import { useAuth } from "../context/useAuth";
import { TermsDialog } from "../legal/HelpPage";
import { POLICY_VERSION } from "../legal/policies";

export default function AuthScreen() {
  const { login, register } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [termsOpened, setTermsOpened] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!isLogin && (!termsOpened || !termsAccepted)) {
      setError("Open the Terms & Privacy Notice, then check the acceptance box to create an account.");
      return;
    }
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, username, password);
        await login(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <p className="eyebrow">COMPUTE LOOP</p>

        <h1>{isLogin ? "Welcome back" : "Create an account"}</h1>

        <p className="subtitle">
          {isLogin
            ? "Sign in to access your compute projects."
            : "Join the distributed computing network."}
        </p>

        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          {!isLogin && (
            <label>
              Username
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </label>
          )}

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
          </label>

          {!isLogin && (
            <div className="signup-consent">
              <button type="button" className="cancel-button" onClick={() => {
                setTermsOpened(true);
                setShowTerms(true);
              }}>Read Terms &amp; Privacy Notice</button>
              <label className="consent-checkbox">
                <input type="checkbox" required disabled={!termsOpened} checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)} />
                <span>I agree to the Terms of Service and acknowledge the Privacy Notice (version {POLICY_VERSION}), including that contributors receive readable input data.</span>
              </label>
              {!termsOpened && <p className="hint">Open the notice to enable this checkbox. Opening it does not automatically accept it.</p>}
            </div>
          )}

          <button type="submit" className="create-button" disabled={loading || (!isLogin && !termsAccepted)}>
            {loading
              ? "Please wait..."
              : isLogin
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <button
          type="button"
          className="cancel-button"
          onClick={() => {
            setIsLogin(!isLogin);
            setError("");
            setTermsAccepted(false);
            setTermsOpened(false);
          }}
        >
          {isLogin
            ? "Need an account? Register"
            : "Already have an account? Sign in"}
        </button>
        <p className="hint"><a href="#help">Help · Terms &amp; Privacy Notice</a></p>
      </div>
      {showTerms && <TermsDialog onClose={() => setShowTerms(false)} />}
    </div>
  );
}
