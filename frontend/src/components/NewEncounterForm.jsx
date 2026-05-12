import { useState } from "react";
import "../style/NewEncounterForm.css";

function NewEncounterForm({ onCreate, onCancel }) {
  const [title, setTitle] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setTitle("");
  }

  return (
    <form className="new-encounter-form" onSubmit={handleSubmit}>
      <label className="new-encounter-field">
        <span>Title</span>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="My new encounter"
        />
      </label>
      <div className="new-encounter-actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" disabled={!title.trim()}>
          Create
        </button>
      </div>
    </form>
  );
}

export default NewEncounterForm;
