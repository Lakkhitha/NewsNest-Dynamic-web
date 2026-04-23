import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";

export default function PostDetailPage({ currentUser }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [postForm, setPostForm] = useState({ title: "", body: "", category: "world", source_url: "", image_url: "" });
  const [savingPost, setSavingPost] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError("Invalid post id.");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(`/posts/${id}`);
        setPost(data.post || null);
        setComments(data.comments || []);
        setPostForm({
          title: data.post?.title || "",
          body: data.post?.body || "",
          category: data.post?.category || "world",
          source_url: data.post?.source_url || "",
          image_url: data.post?.image_url || "",
        });
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load post details.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (loading) {
    return (
      <main className="simple-page">
        <p>Loading post details...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="simple-page">
        <div className="feed-head">
          <h2>Post Detail</h2>
          <button className="ghost-btn" type="button" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
        <p className="error-text">{error}</p>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="simple-page">
        <p>Post not found.</p>
      </main>
    );
  }

  const canManagePost = Number(post.author_id) === Number(currentUser?.id) || currentUser?.role === "admin";

  const savePost = async () => {
    setSavingPost(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.patch(`/posts/${id}`, {
        title: postForm.title,
        body: postForm.body,
        category: postForm.category,
        source_url: postForm.source_url.trim() || undefined,
        image_url: postForm.image_url.trim() || undefined,
      });
      setPost((prev) => ({ ...prev, ...data }));
      setEditMode(false);
      setNotice("Post updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update post.");
    } finally {
      setSavingPost(false);
    }
  };

  const deletePost = async () => {
    const confirmed = window.confirm("Delete this post? It will be hidden from timeline.");
    if (!confirmed) return;

    setDeletingPost(true);
    setError("");
    try {
      await api.delete(`/posts/${id}`);
      navigate("/profile");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete post.");
    } finally {
      setDeletingPost(false);
    }
  };

  const canManageComment = (comment) => Number(comment.author_id) === Number(currentUser?.id) || currentUser?.role === "admin";

  const updateComment = async (commentId) => {
    if (!commentDraft.trim()) return;

    setError("");
    try {
      const { data } = await api.patch(`/social/comments/${commentId}`, { content: commentDraft.trim() });
      setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, ...data } : c)));
      setEditingCommentId(null);
      setCommentDraft("");
      setNotice("Comment updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update comment.");
    }
  };

  const removeComment = async (commentId) => {
    const confirmed = window.confirm("Delete this comment?");
    if (!confirmed) return;

    setError("");
    try {
      await api.delete(`/social/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setNotice("Comment deleted.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete comment.");
    }
  };

  return (
    <main className="page-grid">
      <section className="simple-page">
        <div className="feed-head">
          <h2>Post Detail</h2>
          <button className="ghost-btn" type="button" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
        {notice && <p>{notice}</p>}
        {error && <p className="error-text">{error}</p>}

        <article className="post-card">
          <div className="post-meta">
            <span>{post.author_name || "Unknown"}</span>
            <span>{new Date(post.created_at).toLocaleString()}</span>
          </div>
          {editMode ? (
            <div className="auth-form">
              <input value={postForm.title} onChange={(e) => setPostForm((s) => ({ ...s, title: e.target.value }))} />
              <textarea rows={6} value={postForm.body} onChange={(e) => setPostForm((s) => ({ ...s, body: e.target.value }))} />
              <div className="row-2">
                <select value={postForm.category} onChange={(e) => setPostForm((s) => ({ ...s, category: e.target.value }))}>
                  {[
                    "world",
                    "politics",
                    "technology",
                    "sports",
                    "health",
                    "business",
                    "science",
                    "climate",
                  ].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input value={postForm.source_url} onChange={(e) => setPostForm((s) => ({ ...s, source_url: e.target.value }))} placeholder="Source URL" />
              </div>
              <input value={postForm.image_url} onChange={(e) => setPostForm((s) => ({ ...s, image_url: e.target.value }))} placeholder="Image URL" />
              <div className="action-row">
                <button className="primary-btn" type="button" disabled={savingPost} onClick={savePost}>{savingPost ? "Saving..." : "Save"}</button>
                <button className="ghost-btn" type="button" onClick={() => setEditMode(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h3>{post.title}</h3>
              <p>{post.body}</p>
            </>
          )}
          {post.image_url && <img src={post.image_url} alt={post.title} loading="lazy" />}
          <div className="chip-row">
            <span className="chip">{post.category}</span>
            <span className="chip">score {post.quality_score}</span>
          </div>
          {post.source_url && (
            <p>
              Source: <a className="post-link" href={post.source_url} target="_blank" rel="noreferrer">Open article</a>
            </p>
          )}
          {canManagePost && !editMode && (
            <div className="action-row" style={{ marginTop: 8 }}>
              <button className="ghost-btn" type="button" onClick={() => setEditMode(true)}>Edit Post</button>
              <button className="ghost-btn" type="button" disabled={deletingPost} onClick={deletePost}>
                {deletingPost ? "Deleting..." : "Delete Post"}
              </button>
            </div>
          )}
        </article>
      </section>

      <aside className="simple-page">
        <h3>Comments ({comments.length})</h3>
        {comments.length === 0 && <p>No comments yet.</p>}
        {comments.map((c) => (
          <div className="mini-item" key={c.id}>
            {editingCommentId === c.id ? (
              <>
                <textarea rows={3} value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} />
                <div className="action-row" style={{ marginTop: 8 }}>
                  <button className="ghost-btn" type="button" onClick={() => updateComment(c.id)}>Save</button>
                  <button className="ghost-btn" type="button" onClick={() => setEditingCommentId(null)}>Cancel</button>
                </div>
              </>
            ) : (
              <p>{c.content}</p>
            )}
            <small>{new Date(c.created_at).toLocaleString()}</small>
            {canManageComment(c) && editingCommentId !== c.id && (
              <div className="action-row" style={{ marginTop: 6 }}>
                <button className="ghost-btn" type="button" onClick={() => { setEditingCommentId(c.id); setCommentDraft(c.content || ""); }}>
                  Edit
                </button>
                <button className="ghost-btn" type="button" onClick={() => removeComment(c.id)}>
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}

        <div className="mini-item" style={{ marginTop: 10 }}>
          <strong>Quick Actions</strong>
          <div className="action-row" style={{ marginTop: 8 }}>
            <Link className="ghost-btn" to="/feed">Timeline</Link>
            <Link className="ghost-btn" to="/explore">Explore</Link>
          </div>
        </div>
      </aside>
    </main>
  );
}
