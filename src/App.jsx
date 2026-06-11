import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const ADMIN_PASSWORD = 'Danimea.06'
const EMAIL = 'bursasiu_1@yahoo.com'
const WHATSAPP_NUMBER = '40753921023'

const MENU = [
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
    document.title = selectedPost
      ? `${selectedPost.title} | Naturalife.ro`
      : 'Naturalife.ro - Natură, Ciuperci, Pietre și Vânzări'
  }, [selectedPost])

  useEffect(() => {
    if (posts.length === 0) return

    const params = new URLSearchParams(window.location.search)
    const postSlug = params.get('post')
    if (!postSlug) return

    const foundPost = posts.find(post => post.slug === postSlug || String(post.id) === postSlug)
    if (foundPost) setSelectedPost(foundPost)
  }, [posts])

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
      return [...posts]
        .filter(post => post.category !== 'vanzari')
        .sort((a, b) => (b.views || 0) - (a.views || 0))
    }

    if (page === 'noutati') return posts.filter(post => post.category === 'noutati')
    if (page === 'vanzari') return posts.filter(post => post.category === 'vanzari')
    if (page === 'contact') return []

    return posts.filter(post => post.category !== 'vanzari')
  }, [posts, page])

  function changePage(nextPage) {
    setPage(nextPage)
    setSelectedPost(null)
    window.history.pushState(null, '', window.location.pathname)
  }

  function updateForm(field, value) {
    setForm(current => ({ ...current, [field]: value }))
  }

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
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
  }

  function getImages(post) {
    if (Array.isArray(post.image_urls) && post.image_urls.length > 0) return post.image_urls
    if (post.image_url) return [post.image_url]
    return []
  }

  async function uploadImages() {
    const uploadedUrls = []

    if (form.image_url.trim()) uploadedUrls.push(form.image_url.trim())

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

      if (data?.publicUrl) uploadedUrls.push(data.publicUrl)
    }

    return uploadedUrls
  }

  async function addPost(event) {
    event.preventDefault()

    if (!isAdmin) return alert('Trebuie să fii logat ca admin.')
    if (!form.title.trim() || !form.excerpt.trim() || !form.content.trim()) {
      return alert('Completează titlul, descrierea scurtă și textul postării.')
    }
    if (form.category === 'vanzari' && !form.price) {
      return alert('Pentru vânzări trebuie să pui prețul.')
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

    if (post.slug) window.history.pushState(null, '', `?post=${post.slug}`)

    const newViews = (post.views || 0) + 1

    const { error } = await supabase
      .from('posts')
      .update({ views: newViews })
      .eq('id', post.id)

    if (!error) {
      setPosts(current => current.map(item => item.id === post.id ? { ...item, views: newViews } : item))
    }
  }

  function closePost() {
    setSelectedPost(null)
    window.history.pushState(null, '', window.location.pathname)
  }

  async function deletePost(id) {
    if (!isAdmin) return
    if (!window.confirm('Ștergi această postare?')) return

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)

    if (error) return alert(error.message)

    setSelectedPost(null)
    await loadPosts()
  }

  function postUrl(post) {
    return `${window.location.origin}/?post=${post.slug || post.id}`
  }

  return (
    <div className="site">
      <style>{`
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body {
          margin: 0;
          background: #f3f6ef;
          color: #152015;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        button, input, textarea, select { font: inherit; }
        button { cursor: pointer; }
        .site { min-height: 100vh; }

        .top-shell {
          background:
            radial-gradient(circle at 18% 20%, rgba(255,255,255,.22), transparent 26%),
            linear-gradient(135deg, rgba(14,43,20,.96), rgba(43,112,49,.9)),
            url('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1800&q=80');
          background-size: cover;
          background-position: center;
          color: white;
          padding: 18px 16px 78px;
        }
        .wrap { width: min(1180px, 100%); margin: 0 auto; }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 10px 0 34px;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          color: white;
          font-size: 24px;
          font-weight: 950;
          letter-spacing: -.04em;
          white-space: nowrap;
        }
        .logo-icon {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          background: rgba(255,255,255,.18);
          border: 1px solid rgba(255,255,255,.25);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.18);
        }
        .nav {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          padding: 6px;
          border-radius: 999px;
          background: rgba(255,255,255,.13);
          border: 1px solid rgba(255,255,255,.18);
          backdrop-filter: blur(14px);
        }
        .nav-btn {
          min-width: 92px;
          height: 42px;
          border: 0;
          border-radius: 999px;
          padding: 0 14px;
          color: white;
          background: transparent;
          font-size: 14px;
          font-weight: 900;
          transition: .18s ease;
          white-space: nowrap;
        }
        .nav-btn:hover,
        .nav-btn.active {
          color: #17451f;
          background: white;
          box-shadow: 0 10px 24px rgba(0,0,0,.14);
        }

        .hero {
          display: grid;
          grid-template-columns: 1.1fr .9fr;
          align-items: end;
          gap: 28px;
          min-height: 330px;
        }
        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 18px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,.14);
          border: 1px solid rgba(255,255,255,.22);
          font-weight: 900;
          color: rgba(255,255,255,.92);
        }
        .hero h1 {
          margin: 0;
          max-width: 790px;
          font-size: clamp(38px, 6vw, 78px);
          line-height: .96;
          letter-spacing: -.075em;
        }
        .hero p {
          margin: 22px 0 0;
          max-width: 650px;
          color: rgba(255,255,255,.88);
          font-size: 19px;
          line-height: 1.6;
        }
        .hero-card {
          justify-self: end;
          width: min(390px, 100%);
          padding: 22px;
          border-radius: 30px;
          background: rgba(255,255,255,.14);
          border: 1px solid rgba(255,255,255,.23);
          backdrop-filter: blur(16px);
          box-shadow: 0 24px 70px rgba(0,0,0,.18);
        }
        .hero-card strong { display: block; font-size: 22px; margin-bottom: 8px; }
        .hero-card span { color: rgba(255,255,255,.84); line-height: 1.5; }
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 22px;
        }

        .btn {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 0;
          border-radius: 999px;
          padding: 11px 17px;
          color: #17451f;
          background: white;
          text-decoration: none;
          font-weight: 950;
          box-shadow: 0 10px 22px rgba(21,62,27,.10);
          transition: .18s ease;
        }
        .btn:hover { transform: translateY(-1px); }
        .btn.green { color: white; background: #206b32; }
        .btn.dark { color: white; background: #183a20; }
        .btn.soft { color: white; background: rgba(255,255,255,.16); border: 1px solid rgba(255,255,255,.22); }
        .btn.full { width: 100%; }

        .admin-float {
          position: fixed;
          right: 18px;
          bottom: 18px;
          z-index: 20;
          width: 58px;
          height: 58px;
          border: 0;
          border-radius: 50%;
          color: white;
          background: #183a20;
          box-shadow: 0 16px 35px rgba(0,0,0,.22);
          font-size: 22px;
        }

        main {
          position: relative;
          z-index: 2;
          width: min(1180px, calc(100% - 32px));
          margin: -42px auto 52px;
        }
        .panel,
        .admin-panel,
        .post-view {
          background: rgba(255,255,255,.96);
          border: 1px solid rgba(42,92,44,.09);
          border-radius: 30px;
          box-shadow: 0 24px 75px rgba(22,56,25,.14);
        }
        .panel { padding: 22px; }
        .admin-panel {
          margin-bottom: 18px;
          padding: 22px;
          background: #eef7ea;
          border: 1px dashed #8fb889;
        }
        .section-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 16px;
          margin-bottom: 18px;
        }
        .section-head h2 {
          margin: 0;
          font-size: clamp(26px, 4vw, 38px);
          line-height: 1;
          letter-spacing: -.05em;
        }
        .section-head span { color: #667260; font-weight: 800; }

        .grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }
        .card {
          overflow: hidden;
          border-radius: 24px;
          background: white;
          border: 1px solid #e3ebdf;
          box-shadow: 0 12px 34px rgba(21,61,27,.08);
          transition: .2s ease;
        }
        .card:hover { transform: translateY(-3px); box-shadow: 0 20px 45px rgba(21,61,27,.13); }
        .card-img {
          width: 100%;
          aspect-ratio: 1 / .78;
          display: block;
          object-fit: cover;
          background: linear-gradient(135deg, #dfead8, #f8faf4);
        }
        .card-body { padding: 15px; }
        .badge {
          display: inline-flex;
          align-items: center;
          margin-bottom: 9px;
          padding: 6px 9px;
          border-radius: 999px;
          background: #e8f4e4;
          color: #276b31;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: .04em;
          text-transform: uppercase;
        }
        .card h3 {
          margin: 0 0 7px;
          font-size: 18px;
          line-height: 1.16;
          letter-spacing: -.035em;
        }
        .card p {
          margin: 0 0 12px;
          color: #62705e;
          font-size: 14px;
          line-height: 1.45;
        }
        .meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          color: #6a7667;
          font-size: 13px;
          font-weight: 850;
        }
        .price {
          color: #1f7031;
          font-size: 18px;
          font-weight: 1000;
          white-space: nowrap;
        }
        .stock { margin-top: 9px !important; font-weight: 850; }
        .empty {
          padding: 40px 16px;
          text-align: center;
          color: #687662;
          background: white;
          border-radius: 22px;
          font-weight: 800;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .full { grid-column: 1 / -1; }
        input, textarea, select {
          width: 100%;
          border: 1px solid #d5e2d0;
          border-radius: 16px;
          padding: 13px 14px;
          background: white;
          color: #152015;
          outline: none;
        }
        textarea { min-height: 160px; resize: vertical; }
        input:focus, textarea:focus, select:focus { border-color: #2d873d; box-shadow: 0 0 0 4px rgba(45,135,61,.12); }

        .post-view { overflow: hidden; }
        .post-cover {
          width: 100%;
          max-height: 540px;
          object-fit: cover;
          display: block;
          background: #e8efe3;
        }
        .post-content { padding: clamp(22px, 5vw, 54px); }
        .post-content h1 {
          margin: 14px 0 14px;
          font-size: clamp(34px, 6vw, 64px);
          line-height: .98;
          letter-spacing: -.065em;
        }
        .post-text {
          margin-top: 22px;
          color: #2d392b;
          white-space: pre-wrap;
          font-size: 18px;
          line-height: 1.75;
        }
        .gallery {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin: 22px 0;
        }
        .gallery img {
          width: 100%;
          aspect-ratio: 1;
          object-fit: cover;
          border-radius: 18px;
        }
        .contact-card {
          display: grid;
          gap: 14px;
          padding: 24px;
          background: white;
          border: 1px solid #e3ebdf;
          border-radius: 24px;
        }

        @media (max-width: 1050px) {
          .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .hero { grid-template-columns: 1fr; }
          .hero-card { justify-self: start; }
        }
        @media (max-width: 780px) {
          .top-shell { padding-bottom: 62px; }
          .header { align-items: flex-start; flex-direction: column; }
          .nav {
            width: 100%;
            justify-content: flex-start;
            overflow-x: auto;
            border-radius: 22px;
          }
          .nav-btn { min-width: auto; padding: 0 13px; }
          .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          .form-grid, .gallery { grid-template-columns: 1fr; }
          .section-head { align-items: flex-start; flex-direction: column; }
          main { width: min(100% - 20px, 1180px); }
          .panel { padding: 14px; border-radius: 24px; }
          .card { border-radius: 20px; }
          .card-body { padding: 12px; }
          .card h3 { font-size: 16px; }
          .card p { font-size: 13px; }
        }
        @media (max-width: 430px) {
          .grid { grid-template-columns: 1fr; }
          .hero h1 { font-size: 40px; }
        }
      `}</style>

      <button
        className="admin-float"
        type="button"
        title="Admin"
        onClick={() => setAdminOpen(open => !open)}
      >
        ⚙️
      </button>

      <section className="top-shell">
        <div className="wrap">
          <header className="header">
            <div className="logo">
              <span className="logo-icon">🌿</span>
              <span>Naturalife.ro</span>
            </div>

            <nav className="nav">
              {MENU.map(item => (
                <button
                  key={item.key}
                  type="button"
                  className={`nav-btn ${page === item.key ? 'active' : ''}`}
                  onClick={() => changePage(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </header>

          <div className="hero">
            <div>
              <span className="eyebrow">🌲 Blog & produse naturale</span>
              <h1>Natură, ciuperci, pietre unicat și povești frumoase.</h1>
              <p>
                Naturalife.ro adună articole, fotografii, descoperiri din natură și obiecte unicat,
                într-un site curat, modern și ușor de folosit.
              </p>
              <div className="actions">
                <button className="btn" type="button" onClick={() => changePage('noutati')}>Vezi noutățile</button>
                <button className="btn soft" type="button" onClick={() => changePage('vanzari')}>Produse disponibile</button>
              </div>
            </div>

            <div className="hero-card">
              <strong>Administrare simplă</strong>
              <span>Adaugi postări, poze, produse, preț și stoc direct din butonul admin.</span>
            </div>
          </div>
        </div>
      </section>

      <main>
        {adminOpen && (
          <section className="admin-panel">
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
                <button className="btn dark" type="button" onClick={loginAdmin}>Intră în admin</button>
              </div>
            ) : (
              <form onSubmit={addPost}>
                <div className="section-head">
                  <div>
                    <h2>Adaugă postare</h2>
                    <span>Poți adăuga până la 10 poze la o postare.</span>
                  </div>
                  <button className="btn dark" type="button" onClick={logoutAdmin}>Ieșire admin</button>
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
                    className="full"
                    placeholder="Descriere scurtă"
                    value={form.excerpt}
                    onChange={event => updateForm('excerpt', event.target.value)}
                  />

                  <textarea
                    className="full"
                    placeholder="Textul postării"
                    value={form.content}
                    onChange={event => updateForm('content', event.target.value)}
                  />

                  <input
                    className="full"
                    placeholder="Link poză principală, opțional"
                    value={form.image_url}
                    onChange={event => updateForm('image_url', event.target.value)}
                  />

                  <input
                    className="full"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={event => setImageFiles(event.target.files || [])}
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

                  <button className="btn green full" type="submit" disabled={saving}>
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
              <img className="post-cover" src={getImages(selectedPost)[0]} alt={selectedPost.title} />
            )}

            <div className="post-content">
              <button className="btn dark" type="button" onClick={closePost}>Înapoi</button>

              <div style={{ marginTop: 22 }}>
                <span className="badge">{selectedPost.category === 'vanzari' ? 'Vânzare' : 'Blog'}</span>
              </div>

              <h1>{selectedPost.title}</h1>

              <div className="meta">
                <span>{selectedPost.views || 0} vizualizări</span>
                {selectedPost.category === 'vanzari' && <span className="price">{selectedPost.price} lei</span>}
              </div>

              {getImages(selectedPost).length > 1 && (
                <div className="gallery">
                  {getImages(selectedPost).slice(1).map((image, index) => (
                    <img key={`${image}-${index}`} src={image} alt={`${selectedPost.title} ${index + 2}`} />
                  ))}
                </div>
              )}

              <div className="post-text">{selectedPost.content}</div>

              <div className="actions">
                <a className="btn green" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">Scrie pe WhatsApp</a>
                <a className="btn" href={`mailto:${EMAIL}`}>Trimite email</a>
                <button className="btn" type="button" onClick={() => navigator.clipboard.writeText(postUrl(selectedPost))}>Copiază link</button>
                {isAdmin && <button className="btn dark" type="button" onClick={() => deletePost(selectedPost.id)}>Șterge postarea</button>}
              </div>
            </div>
          </article>
        ) : page === 'contact' ? (
          <section className="panel">
            <div className="section-head">
              <div>
                <h2>Contact</h2>
                <span>Naturalife.ro</span>
              </div>
            </div>

            <div className="contact-card">
              <strong>Email: {EMAIL}</strong>
              <strong>WhatsApp: +{WHATSAPP_NUMBER}</strong>
              <a className="btn green" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">Deschide WhatsApp</a>
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
                      <img className="card-img" src={getImages(post)[0]} alt={post.title} />
                    ) : (
                      <div className="card-img" />
                    )}

                    <div className="card-body">
                      <span className="badge">{post.category === 'vanzari' ? 'Vânzare' : 'Blog'}</span>
                      <h3>{post.title}</h3>
                      <p>{post.excerpt}</p>

                      <div className="meta">
                        <span>{post.views || 0} vizualizări</span>
                        {post.category === 'vanzari' && <span className="price">{post.price} lei</span>}
                      </div>

                      {post.category === 'vanzari' && (
                        <p className="stock">{Number(post.stock) > 0 ? `În stoc: ${post.stock}` : 'Indisponibil'}</p>
                      )}

                      <button className="btn green full" type="button" onClick={() => openPost(post)} style={{ marginTop: 13 }}>
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
