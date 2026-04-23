import { useEffect, useState } from "react";
import api from "../lib/api";

export default function MessagesPage({ currentUser }) {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [thread, setThread] = useState([]);
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [startRecipient, setStartRecipient] = useState("");
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState("");

  const loadConversations = async () => {
    try {
      const { data } = await api.get("/messages/conversations");
      const rows = data || [];
      setConversations(rows);
      if (!selected && rows.length > 0) {
        setSelected(rows[0]);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load conversations.");
    }
  };

  const loadThread = async (partnerId) => {
    setLoadingThread(true);
    try {
      const { data } = await api.get(`/messages/thread/${partnerId}`);
      setThread(data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load thread.");
    } finally {
      setLoadingThread(false);
    }
  };

  useEffect(() => {
    setError("");
    loadConversations();
    api.get("/users/suggestions").then((res) => setSuggestions(res.data || [])).catch(() => setSuggestions([]));

    const intervalId = setInterval(() => {
      loadConversations();
      if (selected?.partner_id) {
        loadThread(selected.partner_id);
      }
    }, 25000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selected?.partner_id) {
      loadThread(selected.partner_id);
    }
  }, [selected]);

  const send = async () => {
    if (!selected?.partner_id || !text.trim()) return;
    setError("");
    try {
      await api.post("/messages", {
        recipient_id: selected.partner_id,
        content: text.trim(),
      });
      setText("");
      await loadThread(selected.partner_id);
      await loadConversations();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to send message.");
    }
  };

  const startConversation = async () => {
    const recipient = Number(startRecipient);
    if (!recipient || !text.trim()) {
      setError("Choose a user and enter a message to start a chat.");
      return;
    }

    setError("");
    try {
      await api.post("/messages", {
        recipient_id: recipient,
        content: text.trim(),
      });
      setText("");
      setStartRecipient("");
      await loadConversations();
      const refreshed = await api.get("/messages/conversations");
      const chat = (refreshed.data || []).find((c) => Number(c.partner_id) === recipient);
      if (chat) {
        setSelected(chat);
        await loadThread(chat.partner_id);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to start conversation.");
    }
  };

  return (
    <main className="messages-layout">
      <section className="simple-page">
        <h2>Conversations</h2>
        {error && <p className="error-text">{error}</p>}
        <div className="mini-item">
          <strong>Start New Chat</strong>
          <p>Select someone and send the first message.</p>
          <select value={startRecipient} onChange={(e) => setStartRecipient(e.target.value)}>
            <option value="">Choose a user</option>
            {suggestions.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <button className="ghost-btn" type="button" onClick={startConversation} style={{ marginTop: 8 }}>
            Start Chat
          </button>
        </div>
        {conversations.length === 0 && <p>No conversations yet. Start one from the panel above.</p>}
        {conversations.map((c) => (
          <button
            className={`mini-item mini-button ${selected?.partner_id === c.partner_id ? "active-mini" : ""}`}
            key={c.partner_id}
            type="button"
            onClick={() => setSelected(c)}
          >
            <strong>{c.partner_name}</strong>
            <p>{c.latest_message}</p>
            <small>
              unread: {c.unread} | {new Date(c.latest_at).toLocaleString()}
            </small>
          </button>
        ))}
      </section>

      <section className="simple-page">
        <h2>Thread</h2>
        <div className="thread-list">
          {loadingThread && <p>Loading thread...</p>}
          {!loadingThread && thread.length === 0 && <p>No messages in this thread yet.</p>}
          {thread.map((m) => (
            <div key={m.id} className={`thread-item ${m.sender_id === currentUser?.id ? "mine" : "theirs"}`}>
              <p>{m.content}</p>
              <small>{new Date(m.created_at).toLocaleString()}</small>
            </div>
          ))}
        </div>
        <div className="comment-row">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type message" />
          <button type="button" className="primary-btn" onClick={send}>
            Send
          </button>
        </div>
      </section>
    </main>
  );
}
