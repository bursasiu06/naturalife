import { useEffect, useMemo, useState } from 'react'

import { supabase } from './supabase'

const ADMIN_PASSWORD = 'admin123'

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

  const [imageFile, setImageFile] = useState(null)

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

  useEffect(() => {

    const onPopState = () => {

      setSelectedPost(null)

      window.scrollTo({ top: 0, behavior: 'smooth' })

    }

    window.addEventListener('popstate', onPopState)

    return () => window.removeEventListener('popstate', onPopState)

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

    if (password === ADMIN_PASSWORD) setIsAdmin(true)

    else alert('Parolă greșită')

  }

  function makeSlug(text) {

    return text

      .toLowerCase()

      .normalize('NFD')

      .replace(/[\u0300-\u036f]/g, '')

      .replace(/[^a-z0-9]+/g, '-')

      .replace(/(^-|-$)+/g, '')

  }

  async function uploadImage() {

    if (!imageFile) return form.image_url

    const ext = imageFile.name.split('.').pop()

    const fileName = `${Date.now()}-${makeSlug(form.title)}.${ext}`

    const { error } = await supabase.storage

      .from('post-images')

      .upload(fileName, imageFile)

    if (error) throw error

    const { data } = supabase.storage

      .from('post-images')

      .getPublicUrl(fileName)

    return data.publicUrl

  }

  async function addPost(e) {

    e.preventDefault()

    if (!form.title || !form.excerpt || !form.content) {

      return alert('Completează titlul, descrierea scurtă și textul postării.')

    }

    setSaving(true)
    try {

      const imageUrl = await uploadImage()

      const { error } = await supabase.from('posts').insert({

        title: form.title,

        slug: `${makeSlug(form.title)}-${Date.now()}`,

        excerpt: form.excerpt,

        content: form.content,

        category: form.category,

        image_url: imageUrl,

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

      setImageFile(null)

      await loadPosts()

      alert('Postarea a fost publicată cu succes!')

    } catch (err) {

      alert('Eroare: ' + err.message)

    }

    setSaving(false)

  }

  async function openPost(post) {

    window.history.pushState({ post: post.id }, '', `#post-${post.id}`)

    setSelectedPost(post)

    window.scrollTo({ top: 0, behavior: 'smooth' })

    const newViews = (post.views || 0) + 1

    await supabase

      .from('posts')

      .update({ views: newViews })

      .eq('id', post.id)

    setPosts(current =>

      current.map(p => p.id === post.id ? { ...p, views: newViews } : p)

    )

  }

  function closePost() {

    if (window.location.hash.startsWith('#post-')) {

      window.history.back()

    } else {

      setSelectedPost(null)

    }

  }

  function changePage(newPage) {

    setPage(newPage)

    setSelectedPost(null)

    window.history.pushState({}, '', window.location.pathname)

    window.scrollTo({ top: 0, behavior: 'smooth' })

  }

  async function deletePost(id) {

    if (!confirm('Ștergi această postare?')) return

    const { error } = await supabase

      .from('posts')

      .delete()

      .eq('id', id)

    if (error) alert(error.message)

    setSelectedPost(null)

    await loadPosts()

  }

  function pageTitle() {

    if (page === 'top') return 'Top Postări'

    if (page === 'noutati') return 'Noutăți'

    if (page === 'vanzari') return 'Vânzări'

    if (page === 'contact') return 'Contact'

    return 'Cele mai noi postări'

  }

  function pageSubtitle() {

    if (page === 'top') return 'Cele mai citite articole.'

    if (page === 'noutati') return 'Ultimele noutăți din natură.'

    if (page === 'vanzari') return 'Produse și lucruri disponibile.'

    if (page === 'contact') return 'Pentru întrebări, colaborări sau comenzi.'

    return 'Articole, idei și povești din natură.'

  }

  return (

    <div className="site">

      <style>{`

        * {

          box-sizing: border-box;

        }

        body {

          margin: 0;

          background: #f4f0e6;

          color: #182415;

          font-family: Arial, Helvetica, sans-serif;

        }

        .site {

          min-height: 100vh;

          padding-bottom: 40px;

        }

        .floating-nav {

          position: sticky;

          top: 0;

          z-index: 20;

          display: flex;

          gap: 22px;

          overflow-x: auto;

          padding: 22px 18px 18px;

          background: #f4f0e6;

          border-bottom: 1px solid rgba(0,0,0,0.08);

          scrollbar-width: none;

        }

        .floating-nav::-webkit-scrollbar {

          display: none;

        }

        .floating-nav button {

          border: 0;

          background: transparent;

          color: #1d2818;

          font-size: 20px;

          font-weight: 800;

          white-space: nowrap;

          padding: 8px 0;

        }

        .floating-nav button:first-child {

          color: #315f22;

          border-bottom: 5px solid #6ca43d;

          border-radius: 3px;

        }

        .admin-float {

          position: fixed;

          right: 22px;

          bottom: 70px;

          z-index: 50;

          width: 82px;

          height: 82px;

          border-radius: 50%;

          border: 3px solid white;

          background: linear-gradient(135deg, #7fb143, #315f22);

          color: white;

          font-weight: 900;

          box-shadow: 0 12px 28px rgba(0,0,0,0.28);

        }

        .hero {

          padding: 44px 26px 24px;

        }

        .eyebrow {

          margin: 0 0 10px;

          color: #5b6a50;

          font-weight: 800;

        }

        .hero h1 {

          margin: 0;

          font-size: clamp(38px, 8vw, 68px);

          line-height: 1;

          letter-spacing: -1px;

        }

        .hero p {

          margin-top: 16px;

          color: #626a5a;

          font-size: 22px;

          font-weight: 700;

        }

        .posts-section {

          padding: 0 14px 30px;

        }

        .grid {

          display: grid;

          grid-template-columns: repeat(2, minmax(0, 1fr));

          gap: 14px;

          max-width: 1100px;

          margin: 0 auto;

        }

        .card {

          background: white;

          border-radius: 18px;

          overflow: hidden;

          box-shadow: 0 8px 20px rgba(0,0,0,0.11);

          cursor: pointer;

          transition: transform .2s ease, box-shadow .2s ease;

        }

        .card:hover {

          transform: translateY(-3px);

          box-shadow: 0 12px 28px rgba(0,0,0,0.15);

        }

        .img-wrap {

          width: 100%;

          height: 115px;

          overflow: hidden;

          background: #d9e2d0;

        }

        .img-wrap img {

          width: 100%;

          height: 100%;

          object-fit: cover;

          display: block;

        }

        .card-body {

          padding: 11px;

        }

        .tag {

          display: inline-block;

          color: #527c32;

          font-size: 12px;

          font-weight: 900;

          text-transform: capitalize;

          margin-bottom: 6px;

        }

        .card h3 {

          margin: 0 0 7px;

          font-size: 16px;

          line-height: 1.15;

          color: #111;

        }

        .card p {

          margin: 0;

          color: #444;

          font-size: 13px;

          line-height: 1.35;

          display: -webkit-box;

          -webkit-line-clamp: 3;

          -webkit-box-orient: vertical;

          overflow: hidden;

        }

        .card-footer {

          margin-top: 10px;

          display: flex;

          flex-direction: column;

          gap: 4px;

          color: #5b6a50;

          font-size: 12px;

        }

        .card-footer strong {

          color: #4e7d2e;

          font-size: 13px;

        }

        .post-full,

        .single-page,

        .admin-panel {

          max-width: 900px;

          margin: 0 16px 30px;

          background: white;

          border-radius: 22px;

          padding: 18px;

          box-shadow: 0 8px 24px rgba(0,0,0,0.12);

        }

        .post-full img {

          width: 100%;

          max-height: 430px;

          object-fit: cover;

          border-radius: 18px;

          display: block;

          margin-bottom: 16px;

        }

        .post-full h2 {

          font-size: 34px;

          line-height: 1.05;

          margin: 8px 0 14px;

        }

        .post-text {

          font-size: 19px;

          line-height: 1.65;

          color: #222;

          white-space: pre-wrap;

        }

        .back-btn {

          border: 0;

          background: #eef5e8;

          color: #315f22;

          padding: 12px 16px;

          border-radius: 999px;

          font-size: 16px;

          font-weight: 900;

          margin-bottom: 16px;

        }

        .admin-panel h2 {

          margin-top: 0;

        }

        .login-box,

        .form {

          display: flex;

          flex-direction: column;

          gap: 12px;

        }

        input,

        select,

        textarea {

          width: 100%;

          border: 1px solid #d6d6d6;

          border-radius: 14px;

          padding: 13px;

          font-size: 16px;

          outline: none;

        }

        textarea {

          min-height: 190px;

          resize: vertical;

        }

        .form button,

        .login-box button {

          border: 0;

          border-radius: 14px;

          background: #416f28;

          color: white;

          padding: 14px;

          font-size: 17px;

          font-weight: 900;

        }

        .danger {

          margin-top: 20px;

          border: 0;

          background: #b71c1c;

          color: white;

          border-radius: 14px;

          padding: 14px 18px;

          font-weight: 900;

        }

        .empty {

          text-align: center;

          font-size: 18px;

          color: #555;

          padding: 30px;

        }

        footer {

          text-align: center;

          color: #5d6657;

          padding: 30px 20px;

        }

        footer h2 {

          color: #26351f;

        }

        @media (min-width: 760px) {

          .grid {

            grid-template-columns: repeat(3, minmax(0, 1fr));

            gap: 20px;

          }

          .img-wrap {

            height: 170px;

          }

          .card h3 {

            font-size: 21px;

          }

          .card p {

            font-size: 15px;

          }

          .post-full,

          .single-page,

          .admin-panel {

            margin: 0 auto 35px;

            padding: 28px;

          }

        }

        @media (max-width: 380px) {

          .grid {

            gap: 10px;

          }

          .card h3 {

            font-size: 14px;

          }

          .card p {

            font-size: 12px;

          }

          .img-wrap {

            height: 100px;

          }

          .card-body {

            padding: 9px;

          }

        }

      `}</style>

      <nav className="floating-nav">

        <button onClick={() => changePage('acasa')}>Acasă</button>

        <button onClick={() => changePage('top')}>Top Postări</button>

        <button onClick={() => changePage('noutati')}>Noutăți</button>

        <button onClick={() => changePage('vanzari')}>Vânzări</button>

        <button onClick={() => changePage('contact')}>Contact</button>

      </nav>  <button className="admin-float" onClick={() => setAdminOpen(!adminOpen)}>

        ⚙️

      </button>

      <header className="hero">

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

            <form className="form" onSubmit={addPost}>

              <input

                placeholder="Titlu postare"

                value={form.title}

                onChange={e => setForm({ ...form, title: e.target.value })}

              />

              <input

                placeholder="Descriere scurtă"

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

                placeholder="Link poză, opțional"

                value={form.image_url}

                onChange={e => setForm({ ...form, image_url: e.target.value })}

              />

              <input

                type="file"

                accept="image/*"

                capture="environment"

                onChange={e => setImageFile(e.target.files?.[0] || null)}

              />

              <textarea

                placeholder="Scrie aici textul postării..."

                value={form.content}

                onChange={e => setForm({ ...form, content: e.target.value })}

              />

              <button disabled={saving}>

                {saving ? 'Se publică...' : 'Publică postarea'}

              </button>

            </form>

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

          <button className="back-btn" onClick={closePost}>← Înapoi</button>

          {selectedPost.image_url && (

            <img src={selectedPost.image_url} alt={selectedPost.title} />

          )}

          <p className="tag">{selectedPost.category} • {selectedPost.views || 0} vizualizări</p>

          <h2>{selectedPost.title}</h2>

          <div className="post-text">{selectedPost.content}</div>

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

            <p className="empty">Nu există postări încă.</p>

          ) : (

            <div className="grid">

              {filteredPosts.map(post => (

                <article className="card" key={post.id} onClick={() => openPost(post)}>

                  <div className="img-wrap">

                    <img

                      src={post.image_url || 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80'}

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