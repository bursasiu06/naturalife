import useEffect(() => {
  if (selectedPost) {
    document.title = `${selectedPost.title} | Naturalife.ro`
  } else {
    document.title = 'Naturalife.ro - Natură, Ciuperci, Pietre și Vânzări'
  }
}, [selectedPost])
import { supabase } from './supabase'

const ADMIN_PASSWORD = 'Danimea.06'
const EMAIL = 'bursasiu_1@yahoo.com'
const WHATSAPP_NUMBER = '40753921023'

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
    if (posts.length === 0) return

    const params = new URLSearchParams(window.location.search)
    const postSlug = params.get('post')

    if (postSlug) {
      const foundPost = posts.find(p => p.slug === postSlug || String(p.id) === postSlug)
      if (foundPost) {
        setSelectedPost(foundPost)
      }
    }
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

    return posts.filter(p => p.category !== 'vanzari')
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
    }

    setSaving(false)
  }

  async function openPost(post) {
    setSelectedPost(post)

    if (post.slug) {
      window.history.pushState(null, '', `?post=${post.slug}`)
    }

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
  import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const ADMIN_PASSWORD = 'Danimea.06'
const EMAIL = 'bursasiu_1@yahoo.com'
const WHATSAPP_NUMBER = '40753921023'

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
    if (posts.length === 0) return

    const params = new URLSearchParams(window.location.search)
    const postSlug = params.get('post')

    if (postSlug) {
      const foundPost = posts.find(p => p.slug === postSlug || String(p.id) === postSlug)
      if (foundPost) {
        setSelectedPost(foundPost)
      }
    }
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

    return posts.filter(p => p.category !== 'vanzari')
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
    }

    setSaving(false)
  }

  async function openPost(post) {
    setSelectedPost(post)

    if (post.slug) {
      window.history.pushState(null, '', `?post=${post.slug}`)
    }

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
