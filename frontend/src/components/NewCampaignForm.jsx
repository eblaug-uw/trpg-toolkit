import { useState } from "react";
import "../style/NewCampaignForm.css";

function NewCampaignForm({ onCreate, onCancel }) {
  const [title, setTitle] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    onCreate(trimmed);
    setTitle("");
  }

  return (
    <form className="new-campaign-form" onSubmit={handleSubmit}>
      <label className="new-campaign-field">
        <span>Title</span>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="My new campaign"
        />
      </label>
      <div className="new-campaign-actions">
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

export default NewCampaignForm;
