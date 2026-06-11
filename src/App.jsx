import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const ADMIN_PASSWORD = 'Danimea.06'
const EMAIL = 'bursasiu_1@yahoo.com'
const WHATSAPP_NUMBER = '40753921023'

const CATEGORIES = [
  { key: 'acasa', label: 'Acasă' },
  { key: 'noutati', label: 'Noutăți' },
  { key: 'top', label: 'Top citite' },
  { key: 'vanzari', label: 'Vânzări' },
  { key: 'contact', label: 'Contact' }
]

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
    image_url: '',
    price: '',
    stock: '1'
  })

  useEffect(() => {
    loadPosts()
  }, [])

  useEffect(() => {
    if (!selectedPost) {
      document.title = 'Naturalife.ro - Natură, Ciuperci, Pietre și Vânzări'
      return
    }

    document.title = `${selectedPost.title} | Naturalife.ro`
  }, [selectedPost])

  useEffect(() => {
    if (posts.length === 0) return

    const params = new URLSearchParams(window.location.search)
    const postSlug = params.get('post')

    if (!postSlug) return

    const foundPost = posts.find(
      post => post.slug === postSlug || String(post.id) === postSlug
    )

    if (foundPost) {
      setSelectedPost(foundPost)
    }
  }, [posts])

  async function loadPosts() {
    setLoading(true)

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      alert('Nu am putut încărca postările: ' + error.message)
    }

    setPosts(data || [])
    setLoading(false)
  }

  const filteredPosts = useMemo(() => {
    if (page === 'top') {
      return [...posts]
        .filter(post => post.category !== 'vanzari')
        .sort((a, b) => (b.views || 0) - (a.views || 0))
    }

    if (page === 'noutati') {
      return posts.filter(post => post.category === 'noutati')
    }

    if (page === 'vanzari') {
      return posts.filter(post => post.category === 'vanzari')
    }

    if (page === 'contact') {
      return []
    }

    return posts.filter(post => post.category !== 'vanzari')
  }, [posts, page])

  function updateForm(field, value) {
    setForm(current => ({
      ...current,
      [field]: value
    }))
  }

  function loginAdmin() {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true)
      setPassword('')
      return
    }

    alert('Parolă greșită')
  }

  function logoutAdmin() {
    setIsAdmin(false)
    setAdminOpen(false)
    setPassword('')
  }

  function makeSlug(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
  }

  async function uploadImages() {
    const uploadedUrls = []

    if (form.image_url.trim()) {
      uploadedUrls.push(form.image_url.trim())
    }

    const files = Array.from(imageFiles).slice(0, 10)

    for (const file of files) {
      const ext = file.name.split('.').pop()
      const safeTitle = makeSlug(form.title) || 'naturalife'
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeTitle}.${ext}`

      const { error } = await supabase.storage
        .from('post-images')
        .upload(fileName, file)

      if (error) throw error

      const { data } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName)

      if (data?.publicUrl) {
        uploadedUrls.push(data.publicUrl)
      }
    }

    return uploadedUrls
  }

  async function addPost(event) {
    event.preventDefault()

    if (!isAdmin) {
      alert('Trebuie să fii logat ca admin.')
      return
    }

    if (!form.title.trim() || !form.excerpt.trim() || !form.content.trim()) {
      alert('Completează titlul, descrierea scurtă și textul postării.')
      return
    }

    if (form.category === 'vanzari' && !form.price) {
      alert('Pentru vânzări trebuie să pui prețul.')
      return
    }

    setSaving(true)

    try {
      const imageUrls = await uploadImages()
      const mainImage = imageUrls[0] || ''

      const { error } = await supabase.from('posts').insert({
        title: form.title.trim(),
        slug: `${makeSlug(form.title)}-${Date.now()}`,
        excerpt: form.excerpt.trim(),
        content: form.content.trim(),
        category: form.category,
        image_url: mainImage,
        image_urls: imageUrls,
        price: form.category === 'vanzari' ? Number(form.price) : null,
        stock: form.category === 'vanzari' ? Number(form.stock || 0) : null,
        views: 0
      })

      if (error) throw error

      setForm({
        title: '',
        excerpt: '',
        content: '',
        category: 'noutati',
        image_url: '',
        price: '',
        stock: '1'
      })

      setImageFiles([])
      await loadPosts()
      alert('Postarea a fost publicată cu succes!')
    } catch (err) {
      alert('Eroare: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function openPost(post) {
    setSelectedPost(post)

    if (post.slug) {
      window.history.pushState(null, '', `?post=${post.slug}`)
    }

    const newViews = (post.views || 0) + 1

    const { error } = await supabase
      .from('posts')
      .update({ views: newViews })
      .eq('id', post.id)

    if (error) {
      console.error(error)
      return
    }

    setPosts(current =>
      current.map(item => item.id === post.id ? { ...item, views: newViews } : item)
    )
  }

  function closePost() {
    setSelectedPost(null)
    window.history.pushState(null, '', window.location.pathname)
  }

  async function deletePost(id) {
    if (!isAdmin) return

    const confirmed = window.confirm('Ștergi această postare?')
    if (!confirmed) return

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    setSelectedPost(null)
    await loadPosts()
  }

  function postUrl(post) {
    const base = window.location.origin
    return `${base}/?post=${post.slug || post.id}`
  }

  function getImages(post) {
    if (Array.isArray(post.image_urls) && post.image_urls.length > 0) {
      return post.image_urls
    }

    if (post.image_url) {
      return [post.image_url]
    }

    return []
  }

  function changePage(nextPage) {
    setPage(nextPage)
    setSelectedPost(null)
    window.history.pushState(null, '', window.location.pathname)
  }

  return (
    <div className="site">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f4f7f2;
          color: #172016;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .site {
          min-height: 100vh;
        }

        .hero {
          position: relative;
          overflow: hidden;
          padding: 28px 18px 70px;
          color: white;
          background:
            linear-gradient(135deg, rgba(15, 48, 23, .94), rgba(29, 94, 45, .88)),
            url('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80');
          background-size: cover;
          background-position: center;
        }

        .hero-inner {
          max-width: 1180px;
          margin: 0 auto;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 48px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 900;
          font-size: 22px;
          letter-spacing: -.04em;
        }

        .brand-mark {
          display: grid;
          place-items: center;
          width: 44px;
          height: 44px;
          border-radius: 16px;
          background: rgba(255, 255, 255, .16);
          border: 1px solid rgba(255, 255, 255, .28);
          backdrop-filter: blur(12px);
        }

        .nav {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
        }

        .nav button,
        .admin-toggle,
        .btn {
          border: 0;
          cursor: pointer;
          font-weight: 800;
          border-radius: 999px;
          transition: .2s ease;
        }

        .nav button {
          padding: 11px 15px;
          color: white;
          background: rgba(255, 255, 255, .12);
          border: 1px solid rgba(255, 255, 255, .18);
        }

        .nav button:hover,
        .nav button.active {
          background: white;
          color: #194c22;
        }

        .hero h1 {
          max-width: 780px;
          margin: 0;
          font-size: clamp(38px, 7vw, 82px);
          line-height: .96;
          letter-spacing: -.07em;
        }

        .hero p {
          max-width: 640px;
          margin: 24px 0 0;
          color: rgba(255, 255, 255, .86);
          font-size: 19px;
          line-height: 1.6;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 28px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          padding: 12px 18px;
          text-decoration: none;
          color: #143b1d;
          background: #fff;
        }

        .btn.dark {
          color: white;
          background: #1f6b32;
        }

        .btn.ghost {
          color: white;
          background: rgba(255, 255, 255, .13);
          border: 1px solid rgba(255, 255, 255, .22);
        }

        main {
          max-width: 1180px;
          margin: -36px auto 0;
          padding: 0 18px 46px;
          position: relative;
          z-index: 2;
        }

        .panel {
          background: rgba(255, 255, 255, .92);
          border: 1px solid rgba(28, 72, 35, .08);
          border-radius: 30px;
          box-shadow: 0 22px 70px rgba(21, 55, 25, .14);
          padding: 24px;
        }

        .section-head {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 16px;
          margin-bottom: 20px;
        }

        .section-head h2 {
          margin: 0;
          font-size: 30px;
          letter-spacing: -.04em;
        }

        .section-head span {
          color: #60705e;
          font-weight: 700;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .card {
          overflow: hidden;
          background: white;
          border: 1px solid #e5ece2;
          border-radius: 24px;
          box-shadow: 0 12px 30px rgba(20, 61, 25, .08);
        }

        .card-image {
          width: 100%;
          aspect-ratio: 4 / 3;
          object-fit: cover;
          background: linear-gradient(135deg, #dfeadc, #f6f8f3);
          display: block;
        }

        .card-body {
          padding: 18px;
        }

        .badge {
          display: inline-flex;
          margin-bottom: 10px;
          padding: 7px 10px;
          border-radius: 999px;
          background: #eaf4e7;
          color: #286a30;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .04em;
        }

        .card h3 {
          margin: 0 0 8px;
          font-size: 21px;
          letter-spacing: -.03em;
          line-height: 1.16;
        }

        .card p {
          margin: 0 0 14px;
          color: #5f6c5d;
          line-height: 1.5;
        }

        .meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          color: #6b7868;
          font-size: 14px;
          font-weight: 700;
        }

        .price {
          color: #1f6b32;
          font-size: 20px;
          font-weight: 950;
        }

        .admin-box {
          margin-top: 22px;
          padding: 20px;
          border-radius: 24px;
          background: #eff7ec;
          border: 1px dashed #94b98e;
        }

        .admin-toggle {
          margin-top: 18px;
          padding: 12px 18px;
          color: white;
          background: #193d20;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        input,
        textarea,
        select {
          width: 100%;
          border: 1px solid #d7e3d3;
          border-radius: 16px;
          padding: 13px 14px;
          font: inherit;
          background: white;
        }

        textarea {
          min-height: 160px;
          resize: vertical;
        }

        .full {
          grid-column: 1 / -1;
        }

        .post-view {
          background: white;
          border-radius: 30px;
          overflow: hidden;
          box-shadow: 0 22px 70px rgba(21, 55, 25, .14);
        }

        .post-cover {
          width: 100%;
          max-height: 520px;
          object-fit: cover;
          display: block;
        }

        .post-content {
          padding: clamp(22px, 5vw, 54px);
        }

        .post-content h1 {
          margin: 0 0 14px;
          font-size: clamp(34px, 6vw, 64px);
          line-height: 1;
          letter-spacing: -.06em;
        }

        .post-text {
          color: #303b2f;
          white-space: pre-wrap;
          font-size: 18px;
          line-height: 1.75;
        }

        .gallery {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin: 22px 0;
        }

        .gallery img {
          width: 100%;
          aspect-ratio: 1 / 1;
          object-fit: cover;
          border-radius: 18px;
        }

        .contact-card {
          display: grid;
          gap: 14px;
          padding: 26px;
          background: white;
          border-radius: 26px;
          border: 1px solid #e3ece1;
        }

        .empty {
          padding: 34px;
          text-align: center;
          color: #667462;
          background: white;
          border-radius: 24px;
        }

        @media (max-width: 900px) {
          .topbar {
            align-items: flex-start;
            flex-direction: column;
          }

          .nav {
            justify-content: flex-start;
          }

          .grid,
          .form-grid,
          .gallery {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header className="hero">
        <div className="hero-inner">
          <div className="topbar">
            <div className="brand">
              <span className="brand-mark">🌿</span>
              <span>Naturalife.ro</span>
            </div>

            <nav className="nav">
              {CATEGORIES.map(item => (
                <button
                  key={item.key}
                  type="button"
                  className={page === item.key ? 'active' : ''}
                  onClick={() => changePage(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <h1>Natură, ciuperci, pietre unicat și obiecte frumoase.</h1>
          <p>
            Un blog curat și modern pentru povești din natură, fotografii,
            descoperiri, produse unicat și lucruri făcute cu pasiune.
          </p>

          <div className="hero-actions">
            <button className="btn" type="button" onClick={() => changePage('noutati')}>
              Vezi noutățile
            </button>
            <button className="btn ghost" type="button" onClick={() => changePage('vanzari')}>
              Vezi vânzările
            </button>
          </div>

          <button
            className="admin-toggle"
            type="button"
            onClick={() => setAdminOpen(open => !open)}
          >
            {adminOpen ? 'Închide admin' : 'Admin'}
          </button>
        </div>
      </header>

      <main>
        {adminOpen && (
          <section className="admin-box">
            {!isAdmin ? (
              <div className="form-grid">
                <input
                  type="password"
                  placeholder="Parola admin"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') loginAdmin()
                  }}
                />
                <button className="btn dark" type="button" onClick={loginAdmin}>
                  Intră în admin
                </button>
              </div>
            ) : (
              <form onSubmit={addPost}>
                <div className="section-head">
                  <div>
                    <h2>Adaugă postare</h2>
                    <span>Poți adăuga până la 10 poze la o postare.</span>
                  </div>
                  <button className="btn dark" type="button" onClick={logoutAdmin}>
                    Ieșire admin
                  </button>
                </div>

                <div className="form-grid">
                  <input
                    placeholder="Titlu"
                    value={form.title}
                    onChange={event => updateForm('title', event.target.value)}
                  />

                  <select
                    value={form.category}
                    onChange={event => updateForm('category', event.target.value)}
                  >
                    <option value="noutati">Noutăți / Blog</option>
                    <option value="vanzari">Vânzări</option>
                  </select>

                  <input
                    placeholder="Descriere scurtă"
                    value={form.excerpt}
                    onChange={event => updateForm('excerpt', event.target.value)}
                    className="full"
                  />

                  <textarea
                    placeholder="Textul postării"
                    value={form.content}
                    onChange={event => updateForm('content', event.target.value)}
                    className="full"
                  />

                  <input
                    placeholder="Link poză principală, opțional"
                    value={form.image_url}
                    onChange={event => updateForm('image_url', event.target.value)}
                    className="full"
                  />

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={event => setImageFiles(event.target.files || [])}
                    className="full"
                  />

                  {form.category === 'vanzari' && (
                    <>
                      <input
                        type="number"
                        min="0"
                        placeholder="Preț lei"
                        value={form.price}
                        onChange={event => updateForm('price', event.target.value)}
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="Stoc"
                        value={form.stock}
                        onChange={event => updateForm('stock', event.target.value)}
                      />
                    </>
                  )}

                  <button className="btn dark full" type="submit" disabled={saving}>
                    {saving ? 'Se publică...' : 'Publică postarea'}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        {selectedPost ? (
          <article className="post-view">
            {getImages(selectedPost)[0] && (
              <img
                className="post-cover"
                src={getImages(selectedPost)[0]}
                alt={selectedPost.title}
              />
            )}

            <div className="post-content">
              <button className="btn dark" type="button" onClick={closePost}>
                Înapoi
              </button>

              <span className="badge" style={{ marginTop: 24 }}>
                {selectedPost.category === 'vanzari' ? 'Vânzare' : 'Blog'}
              </span>

              <h1>{selectedPost.title}</h1>

              <div className="meta">
                <span>{selectedPost.views || 0} vizualizări</span>
                {selectedPost.category === 'vanzari' && (
                  <span className="price">{selectedPost.price} lei</span>
                )}
              </div>

              {getImages(selectedPost).length > 1 && (
                <div className="gallery">
                  {getImages(selectedPost).slice(1).map((image, index) => (
                    <img key={`${image}-${index}`} src={image} alt={`${selectedPost.title} ${index + 2}`} />
                  ))}
                </div>
              )}

              <div className="post-text">{selectedPost.content}</div>

              <div className="hero-actions">
                <a className="btn dark" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">
                  Scrie pe WhatsApp
                </a>
                <a className="btn" href={`mailto:${EMAIL}`}>
                  Trimite email
                </a>
                <button
                  className="btn"
                  type="button"
                  onClick={() => navigator.clipboard.writeText(postUrl(selectedPost))}
                >
                  Copiază link
                </button>

                {isAdmin && (
                  <button className="btn dark" type="button" onClick={() => deletePost(selectedPost.id)}>
                    Șterge postarea
                  </button>
                )}
              </div>
            </div>
          </article>
        ) : page === 'contact' ? (
          <section className="panel">
            <div className="section-head">
              <h2>Contact</h2>
              <span>Naturalife.ro</span>
            </div>

            <div className="contact-card">
              <strong>Email: {EMAIL}</strong>
              <strong>WhatsApp: +{WHATSAPP_NUMBER}</strong>
              <a className="btn dark" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">
                Deschide WhatsApp
              </a>
            </div>
          </section>
        ) : (
          <section className="panel">
            <div className="section-head">
              <div>
                <h2>
                  {page === 'vanzari'
                    ? 'Produse disponibile'
                    : page === 'top'
                      ? 'Cele mai citite'
                      : page === 'noutati'
                        ? 'Noutăți'
                        : 'Ultimele articole'}
                </h2>
                <span>{filteredPosts.length} postări afișate</span>
              </div>
            </div>

            {loading ? (
              <div className="empty">Se încarcă postările...</div>
            ) : filteredPosts.length === 0 ? (
              <div className="empty">Nu există încă postări aici.</div>
            ) : (
              <div className="grid">
                {filteredPosts.map(post => (
                  <article className="card" key={post.id}>
                    {getImages(post)[0] ? (
                      <img className="card-image" src={getImages(post)[0]} alt={post.title} />
                    ) : (
                      <div className="card-image" />
                    )}

                    <div className="card-body">
                      <span className="badge">
                        {post.category === 'vanzari' ? 'Vânzare' : 'Blog'}
                      </span>

                      <h3>{post.title}</h3>
                      <p>{post.excerpt}</p>

                      <div className="meta">
                        <span>{post.views || 0} vizualizări</span>
                        {post.category === 'vanzari' && (
                          <span className="price">{post.price} lei</span>
                        )}
                      </div>

                      {post.category === 'vanzari' && (
                        <p style={{ marginTop: 10 }}>
                          {Number(post.stock) > 0 ? `În stoc: ${post.stock}` : 'Indisponibil'}
                        </p>
                      )}

                      <button
                        className="btn dark"
                        type="button"
                        onClick={() => openPost(post)}
                        style={{ width: '100%', marginTop: 14 }}
                      >
                        Deschide
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
