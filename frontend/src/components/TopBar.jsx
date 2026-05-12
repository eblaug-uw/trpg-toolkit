import { useState } from "react";
import { FaGithub, FaUserCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";
import { supabase } from "../services/supabaseClient";
import Modal from "./Modal";
import { useRuleSet } from "../context/RuleSetContext";

function TopBar() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const { ruleSet, setRuleSet } = useRuleSet();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    navigate("/login");
  };

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 24px",
        borderBottom: "1px solid #222",
        background: "#222",
        color: "white",
      }}
    >
      <h2 style={{ margin: 0 }}>
        {session
          ? `Welcome, ${session.user.user_metadata?.full_name ?? session.user.email}`
          : "TRPG ToolKit"}
      </h2>

      {session ? (
        <button
          onClick={() => setMenuOpen(true)}
          style={{
            background: "transparent",
            border: "none",
            color: "white",
            fontSize: "1.5rem",
            cursor: "pointer",
            padding: 0,
          }}
          aria-label="user menu"
        >
          <FaUserCircle />
        </button>
      ) : (
        <a
          href="https://github.com/eblaug-uw/trpg-toolkit"
          target="_blank"
          rel="noreferrer"
          style={{ color: "white", fontSize: "1.5rem" }}
        >
          <FaGithub />
        </a>
      )}
      <Modal isOpen={menuOpen} onClose={() => setMenuOpen(false)} title="Account">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label htmlFor="ruleset">Choose Rule Set</label>
            <select id="ruleset" value={ruleSet} onChange={(e) => setRuleSet(e.target.value)}>
              <option value="5.0">5.0</option>
              <option value="5.5">5.5</option>
            </select>
          </div>

          <button onClick={handleSignOut}>Sign Out</button>
        </div>
      </Modal>
    </nav>
  );
}

export default TopBar;
