import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../lib/api";

const EMPTY_DASHBOARD = { publishedToday: 0, unreadMessages: 0, openReports: 0 };
const EMPTY_NETWORK = { followers: [], following: [], mutual_count: 0 };

function formatJoinedDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

export default function ProfilePage({ currentUser, onUserUpdated }) {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [notifications, setNotifications] = useState([]);
  const [network, setNetwork] = useState(EMPTY_NETWORK);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [followingState, setFollowingState] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editPostId, setEditPostId] = useState(null);
  const [savingPost, setSavingPost] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", bio: "", avatar_url: "" });
  const [postDraft, setPostDraft] = useState({ title: "", body: "", category: "", source_url: "", image_url: "" });

  const targetUserId = id ? Number(id) : currentUser?.id;
  const isOwnProfile = Number(targetUserId) === Number(currentUser?.id);

  const load = async () => {
    if (!targetUserId) return;

    setLoading(true);
    setError("");
    try {
      const [profileRes, postsRes] = await Promise.all([
        api.get(`/users/${targetUserId}/profile`),
        api.get(`/users/${targetUserId}/posts`),
      ]);

      setProfile(profileRes.data);
      setFollowingState(Boolean(profileRes.data?.isFollowing));
      setPosts(postsRes.data || []);

      if (isOwnProfile) {
        setProfileForm({
          name: profileRes.data?.user?.name || "",
          bio: profileRes.data?.user?.bio || "",
          avatar_url: profileRes.data?.user?.avatar_url || "",
        });

        const [suggestionRes, dashboardRes, notificationRes, networkRes] = await Promise.allSettled([
          api.get("/users/suggestions"),
          api.get("/users/me/dashboard"),
          api.get("/users/me/notifications?limit=6"),
          api.get("/users/me/network"),
        ]);

        setSuggestions(suggestionRes?.status === "fulfilled" ? suggestionRes.value.data || [] : []);
        setDashboard(dashboardRes?.status === "fulfilled" ? dashboardRes.value.data || EMPTY_DASHBOARD : EMPTY_DASHBOARD);
        setNotifications(notificationRes?.status === "fulfilled" ? notificationRes.value.data?.items || [] : []);
        setNetwork(networkRes?.status === "fulfilled" ? networkRes.value.data || EMPTY_NETWORK : EMPTY_NETWORK);
      } else {
        setSuggestions([]);
        setDashboard(EMPTY_DASHBOARD);
        setNotifications([]);
        setNetwork(EMPTY_NETWORK);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load profile details.");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, targetUserId]);

  const follow = async (id) => {
    setNotice("");
    await api.post(`/social/follow/${id}`);
    load();
  };

  const toggleFollow = async () => {
    if (!targetUserId || isOwnProfile) return;
    setNotice("");

    if (followingState) {
      await api.delete(`/social/follow/${targetUserId}`);
    } else {
      await api.post(`/social/follow/${targetUserId}`);
    }
    load();
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        name: profileForm.name,
        bio: profileForm.bio,
        avatar_url: profileForm.avatar_url,
      };
      const { data } = await api.patch("/users/me/profile", payload);
      setProfile((prev) => ({ ...prev, user: { ...prev.user, ...data } }));
      if (onUserUpdated) {
        onUserUpdated(data);
      }
      setNotice("Profile updated successfully.");
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to update profile right now.");
    } finally {
      setSavingProfile(false);
    }
  };

  const startEditPost = (post) => {
    setEditPostId(post.id);
    setPostDraft({
      title: post.title || "",
      body: post.body || "",
      category: post.category || "",
      source_url: post.source_url || "",
      image_url: post.image_url || "",
    });
  };

  const cancelEditPost = () => {
    setEditPostId(null);
    setPostDraft({ title: "", body: "", category: "", source_url: "", image_url: "" });
  };

  const savePost = async () => {
    if (!editPostId) return;

    setSavingPost(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.patch(`/posts/${editPostId}`, postDraft);
      setPosts((prev) => prev.map((post) => (post.id === editPostId ? { ...post, ...data } : post)));
      setNotice("Post updated successfully.");
      cancelEditPost();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to update this post.");
    } finally {
      setSavingPost(false);
    }
  };

  const deletePost = async (postId) => {
    const confirmed = window.confirm("Delete this post? This will hide it from your profile and feed.");
    if (!confirmed) return;

    setError("");
    setNotice("");
    try {
      await api.delete(`/posts/${postId}`);
      setPosts((prev) => prev.filter((post) => post.id !== postId));
      setProfile((prev) => {
        if (!prev?.stats) return prev;
        return {
          ...prev,
          stats: {
            ...prev.stats,
            posts: Math.max(0, Number(prev.stats.posts || 0) - 1),
          },
        };
      });
      setNotice("Post deleted.");
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to delete this post.");
    }
  };

  return (
    <main className="page-grid profile-layout">
      <section className="simple-page profile-main">
        <div className="profile-cover" />
        <div className="profile-head facebook-profile-head">
          <div className="profile-identity">
            <img
              className="profile-avatar"
              src={profile?.user?.avatar_url || "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg"}
              alt="Profile avatar"
            />
            <div>
              <h2>{profile?.user?.name || (isOwnProfile ? "My Profile" : "Profile")}</h2>
              <p>{profile?.user?.bio || "No bio yet. Add one to tell people what you cover."}</p>
              <p className="muted-text profile-meta">
                Joined {formatJoinedDate(profile?.user?.created_at)}
                {isOwnProfile && currentUser?.email ? ` | ${currentUser.email}` : ""}
              </p>
            </div>
          </div>
          <div className="chip-row">
            <span className="chip">Posts {profile?.stats?.posts || 0}</span>
            <span className="chip">Followers {profile?.stats?.followers || 0}</span>
            <span className="chip">Following {profile?.stats?.following || 0}</span>
            {!isOwnProfile && (
              <button className="ghost-btn" type="button" onClick={toggleFollow}>
                {followingState ? "Unfollow" : "Follow"}
              </button>
            )}
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}
        {notice && <p>{notice}</p>}

        {isOwnProfile && (
          <form className="mini-item profile-edit-card" onSubmit={saveProfile}>
            <h3>Edit Profile</h3>
            <div className="profile-edit-grid">
              <label>
                Name
                <input
                  value={profileForm.name}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </label>
              <label>
                Avatar URL
                <input
                  value={profileForm.avatar_url}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, avatar_url: event.target.value }))}
                  placeholder="https://..."
                />
              </label>
            </div>
            <label>
              Bio
              <textarea
                rows={3}
                value={profileForm.bio}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))}
                placeholder="Tell people what topics you post about"
              />
            </label>
            <div className="action-row">
              <button className="primary-btn" type="submit" disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        )}

        <div className="reports-section">
          <h3>{isOwnProfile ? "Manage My Posts" : "Recent Posts"}</h3>
          {loading && <p>Loading profile...</p>}
          {!loading && posts.length === 0 && <p>No posts yet.</p>}
          <div className="feed-grid">
            {posts.map((item) => (
              <article className="post-card profile-post-card" key={item.id}>
                {editPostId === item.id ? (
                  <div className="profile-post-editor">
                    <input
                      value={postDraft.title}
                      onChange={(event) => setPostDraft((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Post title"
                    />
                    <textarea
                      rows={4}
                      value={postDraft.body}
                      onChange={(event) => setPostDraft((prev) => ({ ...prev, body: event.target.value }))}
                      placeholder="Post body"
                    />
                    <div className="row-2">
                      <input
                        value={postDraft.category}
                        onChange={(event) => setPostDraft((prev) => ({ ...prev, category: event.target.value }))}
                        placeholder="Category"
                      />
                      <input
                        value={postDraft.source_url}
                        onChange={(event) => setPostDraft((prev) => ({ ...prev, source_url: event.target.value }))}
                        placeholder="Source URL"
                      />
                    </div>
                    <input
                      value={postDraft.image_url}
                      onChange={(event) => setPostDraft((prev) => ({ ...prev, image_url: event.target.value }))}
                      placeholder="Image URL"
                    />
                    <div className="action-row">
                      <button className="primary-btn" type="button" onClick={savePost} disabled={savingPost}>
                        {savingPost ? "Updating..." : "Update"}
                      </button>
                      <button className="ghost-btn" type="button" onClick={cancelEditPost}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3>
                      <Link className="post-link" to={`/posts/${item.id}`}>{item.title}</Link>
                    </h3>
                    <p>{item.body}</p>
                    <div className="chip-row">
                      <span className="chip">{item.category}</span>
                      <span className="chip">Score {item.quality_score}</span>
                    </div>
                    {isOwnProfile && (
                      <div className="action-row profile-toolbar">
                        <button className="ghost-btn" type="button" onClick={() => startEditPost(item)}>
                          Edit
                        </button>
                        <button className="ghost-btn" type="button" onClick={() => deletePost(item.id)}>
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <aside className="simple-page profile-side">
        {!isOwnProfile && (
          <>
            <h3>Profile Actions</h3>
            <div className="mini-item">
              <p>Viewing public profile of {profile?.user?.name || "user"}.</p>
              <div className="action-row">
                <Link className="ghost-btn" to="/people">Find More People</Link>
                <Link className="ghost-btn" to="/messages">Open Messages</Link>
              </div>
            </div>
          </>
        )}

        {isOwnProfile && <h3>My Command Center</h3>}
        {isOwnProfile && (
          <div className="quick-panels">
            <div className="mini-item">
              <strong>Published Today</strong>
              <p>{dashboard.publishedToday}</p>
            </div>
            <div className="mini-item">
              <strong>Unread Messages</strong>
              <p>{dashboard.unreadMessages}</p>
            </div>
            <div className="mini-item">
              <strong>Open Reports</strong>
              <p>{dashboard.openReports}</p>
            </div>
          </div>
        )}

        {isOwnProfile && (
          <div className="reports-section">
            <h3>Recent Alerts</h3>
            {notifications.length === 0 && <p>No recent notifications yet.</p>}
            {notifications.map((n, idx) => (
              <div className="mini-item" key={`${n.type}-${n.created_at}-${idx}`}>
                <strong>{n.actor || "NewsNest"}</strong>
                <p>{n.message}</p>
                <small>{new Date(n.created_at).toLocaleString()}</small>
              </div>
            ))}
          </div>
        )}

        {isOwnProfile && <h3>People You May Follow</h3>}
        {isOwnProfile && suggestions.map((s) => (
          <div className="mini-item" key={s.id}>
            <strong>{s.name}</strong>
            <p>{s.bio || "Citizen journalist"}</p>
            <div className="action-row">
              <button className="ghost-btn" type="button" onClick={() => follow(s.id)}>
                Follow
              </button>
              <Link className="ghost-btn" to={`/profile/${s.id}`}>
                View
              </Link>
            </div>
          </div>
        ))}

        {isOwnProfile && (
          <div className="reports-section">
            <h3>Network Snapshot</h3>
            <div className="mini-item">
              <p style={{ marginBottom: 6 }}>Followers tracked: {network.followers.length}</p>
              <p style={{ marginBottom: 6, marginTop: 0 }}>Following tracked: {network.following.length}</p>
              <p style={{ margin: 0 }}>Mutual connections: {network.mutual_count}</p>
            </div>

            <div className="mini-item">
              <strong>Recent Followers</strong>
              {network.followers.length === 0 && <p>No followers yet.</p>}
              {network.followers.map((u) => (
                <p key={`f-${u.id}`}>
                  <Link className="post-link" to={`/profile/${u.id}`}>{u.name}</Link>
                </p>
              ))}
            </div>

            <div className="mini-item">
              <strong>Recent Following</strong>
              {network.following.length === 0 && <p>You are not following anyone yet.</p>}
              {network.following.map((u) => (
                <p key={`g-${u.id}`}>
                  <Link className="post-link" to={`/profile/${u.id}`}>{u.name}</Link>
                </p>
              ))}
            </div>
          </div>
        )}
      </aside>
    </main>
  );
}
