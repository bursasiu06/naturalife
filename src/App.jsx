import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const ADMIN_PASSWORD = 'Danimea.06'
const EMAIL = 'bursasiu_1@yahoo.com'

export default function App() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('acasa')
  const [selectedPost, setSelectedPost] = useState(null)

  const [adminOpen, setAdminOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [imageFiles, setImageFiles] = useState([])

  const [form, setForm] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: 'noutati',
    image_url: ''
  })

  useEffect(() => {
    loadPosts()
  }, [])

  async function loadPosts() {
    setLoading(true)

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    setPosts(data || [])
    setLoading(false)
  }

  const filteredPosts = useMemo(() => {
    if (page === 'top') {
      return [...posts].sort((a, b) => (b.views || 0) - (a.views || 0))
    }

    if (page === 'noutati') {
      return posts.filter(p => p.category === 'noutati')
    }

    if (page === 'vanzari') {
      return posts.filter(p => p.category === 'vanzari')
    }

    return posts
  }, [posts, page])

  function loginAdmin() {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true)
      setPassword('')
    } else {
      alert('Parolă greșită')
    }
  }

  function logoutAdmin() {
    setIsAdmin(false)
    setAdminOpen(false)
    setPassword('')
  }

  function makeSlug(text) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
  }

  async function uploadImages() {
    const uploadedUrls = []

    if (form.image_url) {
      uploadedUrls.push(form.image_url)
    }

    const files = Array.from(imageFiles).slice(0, 10)

    for (const file of files) {
      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${makeSlug(form.title)}.${ext}`

      const { error } = await supabase.storage
        .from('post-images')
        .upload(fileName, file)

      if (error) throw error

      const { data } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName)

      uploadedUrls.push(data.publicUrl)
    }

    return uploadedUrls
  }

  async function addPost(e) {
    e.preventDefault()

    if (!isAdmin) {
      return alert('Trebuie să fii logat ca admin.')
    }

    if (!form.title || !form.excerpt || !form.content) {
      return alert('Completează titlul, descrierea scurtă și textul postării.')
    }

    setSaving(true)

    try {
      const imageUrls = await uploadImages()
      const mainImage = imageUrls[0] || ''

      const { error } = await supabase.from('posts').insert({
        title: form.title,
        slug: `${makeSlug(form.title)}-${Date.now()}`,
        excerpt: form.excerpt,
        content: form.content,
        category: form.category,
        image_url: mainImage,
        image_urls: imageUrls,
        views: 0
      })

      if (error) throw error

      setForm({
        title: '',
        excerpt: '',
        content: '',
        category: 'noutati',
        image_url: ''
      })

      setImageFiles([])
      await loadPosts()
      alert('Postarea a fost publicată cu succes!')
    } catch (err) {
      alert('Eroare: ' + err.message)
    }

    setSaving(false)
  }

  async function openPost(post) {
    setSelectedPost(post)

    const newViews = (post.views || 0) + 1

    await supabase
      .from('posts')
      .update({ views: newViews })
      .eq('id', post.id)

    setPosts(current =>
      current.map(p => p.id === post.id ? { ...p, views: newViews } : p)
    )
  }

  async function deletePost(id) {
    if (!isAdmin) return
    if (!confirm('Ștergi această postare?')) return

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)

    if (error) alert(error.message)

    setSelectedPost(null)
    await loadPosts()
  }

  function renderPostContent(post) {
    const images = post.image_urls || []
    const extraImages = images.slice(1)
    const paragraphs = post.content
      .split('\n')
      .map(p => p.trim())
      .filter(Boolean)

    if (paragraphs.length === 0) {
      return null
    }

    return (
      <div className="post-text">
        {paragraphs.map((paragraph, index) => (
          <div key={index}>
            <p>{paragraph}</p>

            {extraImages[index] && (
              <img
                className="inline-post-image"
                src={extraImages[index]}
                alt={`Poză ${index + 2}`}
              />
            )}
          </div>
        ))}

        {extraImages.length > paragraphs.length && (
          <div className="post-gallery">
            {extraImages.slice(paragraphs.length).map((url, index) => (
              <img key={index} src={url} alt={`Poză galerie ${index + 1}`} />
            ))}
          </div>
        )}
      </div>
    )
  }

  function pageTitle() {
    if (page === 'top') return 'Top Postări'
    if (page === 'noutati') return 'Noutăți'
    if (page === 'vanzari') return 'Vânzări'
    if (page === 'contact') return 'Contact'
    return 'Naturalife.ro'
  }

  function pageSubtitle() {
    if (page === 'top') return 'Cele mai accesate postări apar primele.'
    if (page === 'noutati') return 'Ultimele noutăți și postări din natură.'
    if (page === 'vanzari') return 'Produse, obiecte și lucruri disponibile.'
    if (page === 'contact') return 'Pentru întrebări, colaborări sau comenzi.'
    return 'Blog modern cu postări zilnice, natură, poze, noutăți și vânzări.'
  }

  return (
    <div className="site">
      <nav className="floating-nav">
        <button onClick={() => { setPage('acasa'); setSelectedPost(null) }}>Acasă</button>
        <button onClick={() => { setPage('top'); setSelectedPost(null) }}>Top Postări</button>
        <button onClick={() => { setPage('noutati'); setSelectedPost(null) }}>Noutăți</button>
        <button onClick={() => { setPage('vanzari'); setSelectedPost(null) }}>Vânzări</button>
        <button onClick={() => { setPage('contact'); setSelectedPost(null) }}>Contact</button>
      </nav>

      <button className="admin-float" onClick={() => setAdminOpen(!adminOpen)}>
        Admin
      </button>

      <header className="hero">
        <p className="eyebrow">🌿 Blog natural</p>
        <h1>{pageTitle()}</h1>
        <p>{pageSubtitle()}</p>
      </header>

      {adminOpen && (
        <section className="admin-panel">
          <h2>Panou Admin</h2>

          {!isAdmin ? (
            <div className="login-box">
              <input
                type="password"
                placeholder="Parola admin"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button onClick={loginAdmin}>Intră</button>
            </div>
          ) : (
            <>
              <button onClick={logoutAdmin}>Ieși din admin</button>

              <form className="form" onSubmit={addPost}>
                <input
                  placeholder="Titlu postare"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                />

                <input
                  placeholder="Descriere scurtă pentru prima pagină"
                  value={form.excerpt}
                  onChange={e => setForm({ ...form, excerpt: e.target.value })}
                />

                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  <option value="noutati">Noutăți</option>
                  <option value="vanzari">Vânzări</option>
                  <option value="diverse">Diverse</option>
                </select>

                <input
                  placeholder="Link poză directă, opțional"
                  value={form.image_url}
                  onChange={e => setForm({ ...form, image_url: e.target.value })}
                />

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={e => setImageFiles(e.target.files || [])}
                />

                <small>Poți selecta până la 10 poze. Prima poză va fi poza principală.</small>

                <textarea
                  placeholder="Scrie aici textul postării. Pentru poze integrate frumos, scrie textul pe paragrafe separate."
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                />

                <button disabled={saving}>
                  {saving ? 'Se publică...' : 'Publică postarea'}
                </button>
              </form>
            </>
          )}
        </section>
      )}

      {page === 'contact' ? (
        <section className="single-page">
          <h2>Contact Naturalife.ro</h2>
          <p>Email: {EMAIL}</p>
          <p>Telefon / WhatsApp: adaugi aici numărul tău.</p>
          <p>Poți folosi această pagină pentru comenzi, întrebări sau colaborări.</p>
        </section>
      ) : selectedPost ? (
        <article className="post-full">
          <button className="back-btn" onClick={() => setSelectedPost(null)}>← Înapoi</button>

          {(selectedPost.image_urls?.[0] || selectedPost.image_url) && (
            <img
              src={selectedPost.image_urls?.[0] || selectedPost.image_url}
              alt={selectedPost.title}
            />
          )}

          <p className="tag">{selectedPost.category} • {selectedPost.views || 0} vizualizări</p>
          <h2>{selectedPost.title}</h2>

          {renderPostContent(selectedPost)}

          {isAdmin && (
            <button className="danger" onClick={() => deletePost(selectedPost.id)}>
              Șterge postarea
            </button>
          )}
        </article>
      ) : (
        <main className="posts-section">
          {loading ? (
            <p className="empty">Se încarcă postările...</p>
          ) : filteredPosts.length === 0 ? (
            <p className="empty">Nu există postări încă. Intră la Admin și adaugă prima postare.</p>
          ) : (
            <div className="grid">
              {filteredPosts.map(post => (
                <article className="card" key={post.id} onClick={() => openPost(post)}>
                  <div className="img-wrap">
                    <img
                      src={post.image_urls?.[0] || post.image_url || 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80'}
                      alt={post.title}
                    />
                  </div>

                  <div className="card-body">
                    <span className="tag">{post.category}</span>
                    <h3>{post.title}</h3>
                    <p>{post.excerpt}</p>
                    <div className="card-footer">
                      <span>{post.views || 0} vizualizări</span>
                      <strong>Citește →</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      )}

      <footer>
        <h2>Naturalife.ro</h2>
        <p>Postări zilnice, natură, poze, idei și produse frumoase.</p>
        <p>© {new Date().getFullYear()} Naturalife.ro</p>
      </footer>
    </div>
  )
}
