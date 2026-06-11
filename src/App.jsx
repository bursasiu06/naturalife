Am înțeles perfect. Soluția de dinainte folosea un "Modal" (o fereastră suprapusă cu acel X) care bloca ecranul, iar asta poate fi foarte frustrant pe telefon, mai ales cu butonul fizic de "Înapoi".

Am modificat codul radical pe partea asta:

1. **Fără ferestre suprapuse (Modals):** Acum, când dai click pe o postare, aceasta înlocuiește grila de postări. Se comportă vizual exact ca o pagină nouă, curată, direct în fluxul site-ului.
2. **Butonul fizic "Back" (Înapoi) funcționează perfect:** Am adăugat o funcție (`popstate`) care "ascultă" butoanele native ale telefonului sau browserului. Când dai înapoi de pe săgeata telefonului tău, te întoarce la lista de postări exact cum te-ai aștepta.
3. **Buton "Înapoi" dedicat:** Sus pe postare am pus un buton frumos, vizibil, pe care scrie "← Înapoi", în caz că utilizatorul preferă să apese pe ecran.
4. **Scroll inteligent:** Când deschizi o postare, ecranul face scroll fin până sus, ca să simuleze perfect încărcarea unei pagini noi.

Iată codul final. Dă-i din nou Copy-Paste peste cel vechi și nu uita de `Ctrl + F5` pentru refresh!

```javascript
import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const ADMIN_PASSWORD = 'Danimea.06'
const EMAIL = 'bursasiu_1@yahoo.com'
const WHATSAPP_NUMBER = '40753921023'

const NAV_ITEMS = [
  { key: 'acasa', label: 'Acasă' },
  { key: 'top', label: 'Top Postări' },
  { key: 'noutati', label: 'Noutăți' },
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
    if (selectedPost) {
      document.title = `${selectedPost.title} | NaturaLife`
    } else {
      document.title = 'NaturaLife - Natură, Ciuperci, Pietre și Vânzări'
    }
  }, [selectedPost])

  // Ascultăm schimbările din URL pentru încărcare inițială
  useEffect(() => {
    if (posts.length === 0) return

    const params = new URLSearchParams(window.location.search)
    const postSlug = params.get('post')

    if (postSlug && !selectedPost) {
      const foundPost = posts.find(p => p.slug === postSlug || String(p.id) === postSlug)
      if (foundPost) {
        setSelectedPost(foundPost)
      }
    }
  }, [posts, selectedPost])

  // Aici facem telefonul să reacționeze la butonul NATIV de Back
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const postSlug = params.get('post')
      if (postSlug && posts.length > 0) {
        const foundPost = posts.find(p => p.slug === postSlug || String(p.id) === postSlug)
        setSelectedPost(foundPost || null)
      } else {
        setSelectedPost(null)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
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
      return posts
        .filter(p => p.category !== 'vanzari')
        .sort((a, b) => (b.views || 0) - (a.views || 0))
    }

    if (page === 'noutati') {
      return posts.filter(p => p.category === 'noutati')
    }

    if (page === 'vanzari') {
      return posts.filter(p => p.category === 'vanzari')
    }

    if (page === 'contact') {
      return []
    }

    return posts.filter(p => p.category !== 'vanzari')
  }, [posts, page])

  const trendingPosts = useMemo(() => {
    const list = posts
      .filter(p => p.category !== 'vanzari')
      .sort((a, b) => (b.views || 0) - (a.views || 0))

    return list.length ? list.slice(0, 4) : posts.slice(0, 4)
  }, [posts])

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

    if (form.category === 'vanzari' && !form.price) {
      return alert('Pentru vânzări trebuie să pui prețul.')
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

    // Scroll sus imediat după deschidere pentru a simula o pagină nouă
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 50)

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
    setSelectedPost(null)
    window.history.pushState(null, '', window.location.pathname)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

  function postUrl(post) {
    const base = window.location.origin
    return `${base}/?post=${post.slug || post.id}`
  }

  function goToPage(nextPage) {
    setPage(nextPage)
    setSelectedPost(null)
    window.history.pushState(null, '', window.location.pathname)
    setTimeout(() => {
      const el = document.getElementById('content')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }, 50)
  }

  function getImages(post) {
    if (Array.isArray(post.image_urls) && post.image_urls.length) return post.image_urls
    if (post.image_url) return [post.image_url]
    return []
  }

  const pageTitle = {
    acasa: 'Cele mai noi postări',
    top: 'Top postări',
    noutati: 'Noutăți',
    vanzari: 'Produse de vânzare',
    contact: 'Contact'
  }[page]

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Arial, Helvetica, sans-serif;
          background: #f2eee5;
          color: #111;
        }

        button,
        input,
        textarea,
        select {
          font-family: inherit;
        }

        .site {
          min-height: 100vh;
          background:
            radial-gradient(circle at 50% 0%, rgba(255,255,255,0.2), transparent 30%),
            linear-gradient(180deg, #f3efe6 0%, #eee8dc 100%);
        }

        .hero {
          min-height: 350px;
          color: #fff;
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(90deg, rgba(4, 15, 9, 0.92), rgba(11, 37, 21, 0.62), rgba(11, 12, 10, 0.85)),
            url('https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1800&q=80');
          background-size: cover;
          background-position: center;
        }

        .hero::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.2));
          pointer-events: none;
        }

        .heroInner {
          position: relative;
          z-index: 2;
          width: min(1360px, calc(100% - 48px));
          margin: 0 auto;
          padding: 16px 0 54px;
        }

        .topBar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 58px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 24px;
          font-weight: 900;
          letter-spacing: -1px;
          text-shadow: 0 2px 8px rgba(0,0,0,0.55);
        }

        .logoIcon {
          width: 26px;
          height: 26px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: rgba(255,255,255,0.12);
        }

        .topNav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .navPill {
          border: 1px solid rgba(255,255,255,0.44);
          background: rgba(0,0,0,0.35);
          color: #fff;
          font-weight: 800;
          font-size: 15px;
          padding: 9px 16px;
          border-radius: 999px;
          cursor: pointer;
          box-shadow: inset 0 1px rgba(255,255,255,0.18), 0 8px 22px rgba(0,0,0,0.18);
          transition: 0.2s;
        }

        .navPill:hover,
        .navPill.active {
          background: rgba(255,255,255,0.23);
          transform: translateY(-1px);
        }

        .heroGrid {
          display: grid;
          grid-template-columns: 1fr 1.6fr 1fr;
          gap: 36px;
          align-items: center;
        }

        .trendStack {
          display: grid;
          gap: 30px;
        }

        .trendItem {
          max-width: 260px;
          text-shadow: 0 2px 5px rgba(0,0,0,0.55);
        }

        .trendKicker {
          font-size: 12px;
          text-transform: uppercase;
          opacity: 0.82;
          margin-bottom: 4px;
        }

        .trendTitle {
          font-size: 16px;
          line-height: 1.1;
          font-weight: 900;
          margin: 0 0 6px;
        }

        .trendLink {
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          background: none;
          border: 0;
          padding: 0;
          cursor: pointer;
        }

        .heroCenter {
          text-align: center;
          text-shadow: 0 3px 7px rgba(0,0,0,0.62);
        }

        .heroTitle {
          font-size: clamp(30px, 4.2vw, 48px);
          line-height: 0.98;
          margin: 0 0 12px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: -1px;
        }

        .heroSubtitle {
          margin: 0 auto 24px;
          font-size: clamp(19px, 2.3vw, 28px);
          line-height: 1.15;
          max-width: 820px;
        }

        .heroCta {
          border: 0;
          color: #fff;
          background: linear-gradient(180deg, #8bb846, #5b852d);
          padding: 14px 31px;
          border-radius: 999px;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 12px 28px rgba(0,0,0,0.32);
        }

        .centerMenuWrap {
          background: rgba(248, 244, 235, 0.95);
          border-bottom: 1px solid rgba(46, 65, 30, 0.1);
          position: sticky;
          top: 0;
          z-index: 20;
          backdrop-filter: blur(10px);
        }

        .centerMenu {
          width: min(1360px, calc(100% - 48px));
          margin: 0 auto;
          min-height: 74px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 30px;
          flex-wrap: wrap;
        }

        .centerMenu button {
          background: transparent;
          border: 0;
          cursor: pointer;
          font-size: 16px;
          color: #202513;
          font-weight: 900;
          padding: 10px 0;
          position: relative;
        }

        .centerMenu button::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: 4px;
          width: 0;
          height: 3px;
          border-radius: 99px;
          background: #628a32;
          transform: translateX(-50%);
          transition: 0.2s;
        }

        .centerMenu button:hover::after,
        .centerMenu button.active::after {
          width: 100%;
        }

        .content {
          width: min(1390px, calc(100% - 48px));
          margin: 0 auto;
          padding: 34px 0 70px;
        }

        .sectionHead {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .sectionHead h2 {
          margin: 0;
          font-size: 26px;
          color: #1e2413;
        }

        .sectionHead p {
          margin: 6px 0 0;
          color: #5f634f;
          font-weight: 600;
        }

        /* GRILĂ - 4 COLOANE PE PC */
        .postsGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 20px;
        }

        .postCard {
          background: #fff;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(34, 38, 22, 0.09);
          box-shadow: 0 12px 34px rgba(38, 45, 24, 0.12);
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .postCard:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 42px rgba(38, 45, 24, 0.18);
        }

        .cardImage {
          width: 100%;
          height: 142px;
          object-fit: cover;
          display: block;
          background: linear-gradient(135deg, #d7d5ca, #b5c19d);
        }

        .cardBody {
          padding: 14px 12px 12px;
        }

        .cardTitle {
          margin: 0 0 8px;
          font-size: 18px;
          line-height: 1.13;
          font-weight: 950;
          color: #0d0f0a;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .cardExcerpt {
          margin: 0;
          color: #1f211c;
          font-size: 13px;
          line-height: 1.35;
          min-height: 52px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .cardMeta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-top: 13px;
          font-size: 12px;
          color: #2e371f;
        }

        .author {
          display: flex;
          align-items: center;
          gap: 7px;
          white-space: nowrap;
        }

        .avatar {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #e8e1d5;
          font-size: 12px;
        }

        .readMore {
          color: #496b25;
          font-weight: 900;
          white-space: nowrap;
        }

        .priceRow {
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .price {
          font-size: 18px;
          font-weight: 950;
          color: #456c20;
        }

        .stock {
          font-size: 12px;
          font-weight: 900;
          color: #fff;
          background: #587d2b;
          border-radius: 999px;
          padding: 5px 8px;
        }

        .stock.out {
          background: #8c2e22;
        }

        .empty {
          background: rgba(255,255,255,0.75);
          border-radius: 14px;
          padding: 28px;
          text-align: center;
          font-weight: 800;
          color: #4c5339;
        }

        /* --- STILURI PAGINĂ NOUĂ POSTARE (NU MAI E MODAL) --- */
        .singlePost {
          background: #fff;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 18px 45px rgba(22, 25, 15, 0.08);
          border: 1px solid rgba(34,38,22,0.08);
          max-width: 900px;
          margin: 0 auto;
        }

        .singlePostTopBar {
          padding: 16px 24px;
          background: #fbfaf7;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }

        .backBtn {
          display: inline-flex;
          align-items: center;
          background: #202719;
          color: #fff;
          border: 0;
          padding: 10px 18px;
          border-radius: 999px;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          transition: 0.2s;
        }

        .backBtn:hover {
          background: #496b25;
        }

        .singlePostImg {
          width: 100%;
          max-height: 500px;
          object-fit: cover;
          display: block;
          background: #d8d8cf;
        }

        .singlePostBody {
          padding: 34px 24px;
        }

        .singlePostBody h1 {
          margin: 0 0 10px;
          font-size: clamp(26px, 4vw, 40px);
          line-height: 1.05;
        }

        .singlePostMeta {
          color: #5f634f;
          font-weight: 600;
          margin-top: 0;
          margin-bottom: 24px;
          font-size: 16px;
        }

        .modalContent {
          white-space: pre-wrap;
          line-height: 1.65;
          color: #26291d;
          font-size: 16px;
        }

        .gallery {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 10px;
          margin: 18px 0;
        }

        .gallery img {
          width: 100%;
          height: 140px;
          object-fit: cover;
          border-radius: 10px;
        }

        .shareBox {
          background: #f4f0e7;
          border-radius: 12px;
          padding: 14px;
          margin: 18px 0;
          word-break: break-all;
          color: #354021;
          font-weight: 700;
        }

        .contactBox,
        .adminPanel {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 18px 45px rgba(22, 25, 15, 0.18);
          border: 1px solid rgba(34,38,22,0.08);
        }

        .contactBox {
          max-width: 780px;
          margin: 0 auto;
          padding: 28px;
          text-align: center;
        }

        .contactActions {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 20px;
        }

        .actionBtn {
          border: 0;
          border-radius: 999px;
          padding: 12px 19px;
          font-weight: 900;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          color: #fff;
          background: #527a27;
        }

        .actionBtn.light {
          background: #22291a;
        }

        .dangerBtn {
          background: #8c2e22;
          color: #fff;
          border: 0;
          border-radius: 10px;
          padding: 11px 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .adminFab {
          position: fixed;
          right: 18px;
          bottom: 18px;
          width: 58px;
          height: 58px;
          border-radius: 999px;
          border: 2px solid rgba(255,255,255,0.9);
          color: #fff;
          background: linear-gradient(180deg, #6e9835, #344d1b);
          box-shadow: 0 14px 34px rgba(0,0,0,0.26);
          font-size: 22px;
          cursor: pointer;
          z-index: 70;
        }

        .adminDrawer {
          position: fixed;
          right: 18px;
          bottom: 88px;
          width: min(430px, calc(100% - 36px));
          max-height: calc(100vh - 120px);
          overflow: auto;
          z-index: 75;
        }

        .adminPanel {
          padding: 18px;
        }

        .adminPanel h3 {
          margin: 0 0 14px;
        }

        .adminPanel form {
          display: grid;
          gap: 10px;
        }

        .field {
          width: 100%;
          border: 1px solid #d2d7c7;
          border-radius: 10px;
          padding: 11px 12px;
          font-size: 14px;
          outline: none;
          background: #fbfaf7;
        }

        textarea.field {
          min-height: 110px;
          resize: vertical;
        }

        .adminRow {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .adminActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 6px;
        }

        .adminBtn {
          border: 0;
          border-radius: 10px;
          background: #587d2b;
          color: #fff;
          padding: 11px 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .adminBtn.dark {
          background: #202719;
        }

        @media (max-width: 1180px) {
          .postsGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr)); /* 3 COLOANE PE TABLETĂ/LAPTOP MIC */
          }

          .heroGrid {
            grid-template-columns: 1fr;
            gap: 22px;
          }

          .trendStack {
            display: none;
          }

          .topBar {
            margin-bottom: 40px;
          }
        }

        @media (max-width: 760px) {
          .heroInner,
          .centerMenu,
          .content {
            width: min(100% - 24px, 1390px);
          }

          .topBar {
            align-items: flex-start;
            flex-direction: column;
            margin-bottom: 42px;
          }

          .topNav {
            justify-content: flex-start;
          }

          .navPill {
            font-size: 14px;
            padding: 8px 12px;
          }

          .hero {
            min-height: 390px;
          }

          .centerMenu {
            gap: 18px;
            min-height: 64px;
          }

          .centerMenu button {
            font-size: 14px;
          }

          /* 2 COLOANE PE TELEFON MEREU */
          .postsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .cardImage {
            height: 120px;
          }

          .cardTitle {
            font-size: 15px;
          }

          .cardExcerpt {
            font-size: 12px;
          }

          .cardMeta {
            align-items: flex-start;
            flex-direction: column;
          }

          .adminRow {
            grid-template-columns: 1fr;
          }

          /* Adaptări pentru noua pagină de postare pe telefon */
          .singlePostBody {
            padding: 24px 16px;
          }
          .singlePostTopBar {
            padding: 12px 16px;
          }
        }

        @media (max-width: 470px) {
          .heroTitle {
            font-size: 30px;
          }

          .heroSubtitle {
            font-size: 18px;
          }
        }
      `}</style>

      <div className="site">
        <header className="hero">
          <div className="heroInner">
            <div className="topBar">
              <div className="logo">
                <span className="logoIcon">🌿</span>
                <span>NaturaLife</span>
              </div>

              <nav className="topNav">
                {NAV_ITEMS.map(item => (
                  <button
                    key={item.key}
                    className={`navPill ${page === item.key ? 'active' : ''}`}
                    onClick={() => goToPage(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="heroGrid">
              <div className="trendStack">
                {trendingPosts.slice(0, 2).map(post => (
                  <div className="trendItem" key={post.id}>
                    <div className="trendKicker">Trending posts</div>
                    <h3 className="trendTitle">{post.title}</h3>
                    <button className="trendLink" onClick={() => openPost(post)}>
                      Citește mai mult
                    </button>
                  </div>
                ))}
              </div>

              <div className="heroCenter">
                <h1 className="heroTitle">Explorează natura.<br />Citește postările.</h1>
                <p className="heroSubtitle">Cele mai noi idei și știri despre viața în natură.</p>
                <button className="heroCta" onClick={() => goToPage('acasa')}>
                  Citește Blogul
                </button>
              </div>

              <div className="trendStack">
                {trendingPosts.slice(2, 4).map(post => (
                  <div className="trendItem" key={post.id}>
                    <div className="trendKicker">Trending posts</div>
                    <h3 className="trendTitle">{post.title}</h3>
                    <button className="trendLink" onClick={() => openPost(post)}>
                      Citește mai mult
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="centerMenuWrap">
          <nav className="centerMenu">
            {NAV_ITEMS.map(item => (
              <button
                key={item.key}
                className={page === item.key ? 'active' : ''}
                onClick={() => goToPage(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <main id="content" className="content">
          {selectedPost ? (
            /* --- AICI ESTE PAGINA POSTĂRII DESCHISE --- */
            <article className="singlePost">
              <div className="singlePostTopBar">
                <button className="backBtn" onClick={closePost}>
                  ← Înapoi
                </button>
              </div>

              {getImages(selectedPost)[0] && (
                <img className="singlePostImg" src={getImages(selectedPost)[0]} alt={selectedPost.title} />
              )}

              <div className="singlePostBody">
                <h1>{selectedPost.title}</h1>
                <p className="singlePostMeta">
                  {selectedPost.category === 'vanzari' && selectedPost.price
                    ? `Preț: ${selectedPost.price} lei`
                    : `Vizualizări: ${selectedPost.views || 0}`}
                </p>

                {getImages(selectedPost).length > 1 && (
                  <div className="gallery">
                    {getImages(selectedPost).slice(1).map((img, index) => (
                      <img key={`${img}-${index}`} src={img} alt={`${selectedPost.title} ${index + 2}`} />
                    ))}
                  </div>
                )}

                <div className="modalContent">{selectedPost.content}</div>

                <div className="shareBox">
                  Link postare: {postUrl(selectedPost)}
                </div>

                <div className="contactActions" style={{ justifyContent: 'flex-start' }}>
                  {selectedPost.category === 'vanzari' && (
                    <a
                      className="actionBtn"
                      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Salut! Mă interesează produsul: ${selectedPost.title} - ${postUrl(selectedPost)}`)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Comandă pe WhatsApp
                    </a>
                  )}

                  <a
                    className="actionBtn light"
                    href={`mailto:${EMAIL}?subject=${encodeURIComponent(selectedPost.title)}&body=${encodeURIComponent(postUrl(selectedPost))}`}
                  >
                    Trimite pe Email
                  </a>

                  {isAdmin && (
                    <button className="dangerBtn" onClick={() => deletePost(selectedPost.id)}>
                      Șterge postarea
                    </button>
                  )}
                </div>
              </div>
            </article>
          ) : page === 'contact' ? (
            /* --- PAGINA DE CONTACT --- */
            <section className="contactBox">
              <h2>Contact NaturaLife</h2>
              <p>Pentru produse, colaborări sau întrebări, mă poți contacta rapid pe email sau WhatsApp.</p>
              <div className="contactActions">
                <a className="actionBtn" href={`mailto:${EMAIL}`}>Trimite Email</a>
                <a
                  className="actionBtn light"
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              </div>
            </section>
          ) : (
            /* --- LISTA CU TOATE POSTĂRILE --- */
            <>
              <div className="sectionHead">
                <div>
                  <h2>{pageTitle}</h2>
                  <p>{page === 'vanzari' ? 'Produse disponibile și obiecte naturale.' : 'Articole, idei și povești din natură.'}</p>
                </div>
              </div>

              {loading ? (
                <div className="empty">Se încarcă postările...</div>
              ) : filteredPosts.length === 0 ? (
                <div className="empty">Nu există postări aici momentan.</div>
              ) : (
                <section className="postsGrid">
                  {filteredPosts.map(post => {
                    const image = post.image_url || (Array.isArray(post.image_urls) ? post.image_urls[0] : '')

                    return (
                      <article className="postCard" key={post.id} onClick={() => openPost(post)}>
                        {image ? (
                          <img className="cardImage" src={image} alt={post.title} />
                        ) : (
                          <div className="cardImage" />
                        )}

                        <div className="cardBody">
                          <h3 className="cardTitle">{post.title}</h3>
                          <p className="cardExcerpt">{post.excerpt}</p>

                          {post.category === 'vanzari' && (
                            <div className="priceRow">
                              <span className="price">{post.price ? `${post.price} lei` : 'Preț la cerere'}</span>
                              <span className={`stock ${Number(post.stock || 0) > 0 ? '' : 'out'}`}>
                                {Number(post.stock || 0) > 0 ? 'În stoc' : 'Indisponibil'}
                              </span>
                            </div>
                          )}

                          <div className="cardMeta">
                            <span className="author">
                              <span className="avatar">👤</span>
                              <span>Authors info</span>
                            </span>
                            <span className="readMore">Citește mai mult</span>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </section>
              )}
            </>
          )}
        </main>

        <button className="adminFab" onClick={() => setAdminOpen(!adminOpen)} title="Admin">
          ⚙️
        </button>

        {adminOpen && (
          <div className="adminDrawer">
            <div className="adminPanel">
              {!isAdmin ? (
                <>
                  <h3>Admin</h3>
                  <input
                    className="field"
                    type="password"
                    placeholder="Parola admin"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loginAdmin()}
                  />
                  <div className="adminActions">
                    <button className="adminBtn" onClick={loginAdmin}>Intră</button>
                    <button className="adminBtn dark" onClick={() => setAdminOpen(false)}>Închide</button>
                  </div>
                </>
              ) : (
                <>
                  <h3>Adaugă postare / produs</h3>
                  <form onSubmit={addPost}>
                    <input
                      className="field"
                      placeholder="Titlu"
                      value={form.title}
                      onChange={e => setForm({ ...form, title: e.target.value })}
                    />

                    <input
                      className="field"
                      placeholder="Descriere scurtă"
                      value={form.excerpt}
                      onChange={e => setForm({ ...form, excerpt: e.target.value })}
                    />

                    <textarea
                      className="field"
                      placeholder="Text complet"
                      value={form.content}
                      onChange={e => setForm({ ...form, content: e.target.value })}
                    />

                    <select
                      className="field"
                      value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })}
                    >
                      <option value="noutati">Noutăți</option>
                      <option value="vanzari">Vânzări</option>
                    </select>

                    <input
                      className="field"
                      placeholder="Link imagine principală, opțional"
                      value={form.image_url}
                      onChange={e => setForm({ ...form, image_url: e.target.value })}
                    />

                    <input
                      className="field"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={e => setImageFiles(e.target.files)}
                    />

                    {form.category === 'vanzari' && (
                      <div className="adminRow">
                        <input
                          className="field"
                          type="number"
                          placeholder="Preț"
                          value={form.price}
                          onChange={e => setForm({ ...form, price: e.target.value })}
                        />

                        <input
                          className="field"
                          type="number"
                          placeholder="Stoc"
                          value={form.stock}
                          onChange={e => setForm({ ...form, stock: e.target.value })}
                        />
                      </div>
                    )}

                    <div className="adminActions">
                      <button className="adminBtn" type="submit" disabled={saving}>
                        {saving ? 'Se publică...' : 'Publică'}
                      </button>
                      <button className="adminBtn dark" type="button" onClick={logoutAdmin}>
                        Ieși din admin
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

```
