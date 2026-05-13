import { sendContact } from "../api";
import { useState } from "react";

export function StaticPage({ title, eyebrow, description, contact = false }: { title: string; eyebrow: string; description: string; contact?: boolean }) {
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  return (
    <section className="page-card card-surface static-page">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
      {contact ? (
        <form
          className="contact-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const result = await sendContact(form);
            setStatus(result.message);
            setForm({ name: "", email: "", subject: "", message: "" });
          }}
        >
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Name" />
          <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" />
          <input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Subject" />
          <textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Message" rows={6} />
          <button className="solid-button" type="submit">Send message</button>
        </form>
      ) : null}
      {status ? <p className="feedback">{status}</p> : null}
    </section>
  );
}
