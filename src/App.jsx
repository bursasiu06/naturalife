import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const WHATSAPP_NUMBER = '40753921023'
const EMAIL = 'bursasiu_1@yahoo.com'
const DEFAULT_ADMIN_PASSWORD = 'admin123'

const CATEGORIES = [
  'Toate',
  'Pietre Unicat',
  'Obiecte Lemn',
  'Căsuțe Păsărele',
  'Diverse'
]

export default function App() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [adminOpen, setAdminOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [password, setPassword] = useState('')
  const [currentAdminPassword, setCurrentAdminPassword] = useState(DEFAULT_ADMIN_PASSWORD)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('Toate')

  const [form, setForm] = useState({
    name: '',
    description: '',
    details: '',
    price: '',
    stock: '1',
    category: 'Pietre Unicat',
    image_url: ''
  })

  const [imageFile, setImageFile] = useState(null)

  useEffect(() => {
    const savedPassword = localStorage.getItem('naturalifeAdminPassword')
    if (savedPassword) setCurrentAdminPassword(savedPassword)
    loadProducts()
  }, [])

  async function loadProducts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    setProducts(data || [])
    setLoading(false)
  }

  const visibleProducts = useMemo(() => {
    return products.filter(product => {
      const active = product.active !== false
      const categoryMatch =
        selectedCategory === 'Toate' || product.category === selectedCategory

      return active && categoryMatch
    })
  }, [products, selectedCategory])

  function loginAdmin() {
    if (password === currentAdminPassword) {
      setIsAdmin(true)
      setPassword('')
    } else {
      alert('Parolă greșită')
    }
  }

  function changeAdminPassword() {
    if (oldPassword !== currentAdminPassword) {
      alert('Parola veche nu este corectă')
      return
    }

    if (newPassword.length < 4) {
      alert('Parola nouă trebuie să aibă minim 4 caractere')
      return
    }

    localStorage.setItem('naturalifeAdminPassword', newPassword)
    setCurrentAdminPassword(newPassword)
    setOldPassword('')
    setNewPassword('')
    alert('Parola a fost schimbată')
  }

  async function uploadImage() {
    if (!imageFile) return form.image_url

    const ext = imageFile.name.split('.').pop()
    const fileName = `${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('products')
      .upload(fileName, imageFile)

    if (error) throw error

    const { data } = supabase.storage
      .from('products')
      .getPublicUrl(fileName)

    return data.publicUrl
  }

  async function addProduct(e) {
    e.preventDefault()

    if (!form.name || !form.price) {
      alert('Completează numele și prețul produsului')
      return
    }

    setSaving(true)

    try {
      const imageUrl = await uploadImage()

      const { error } = await supabase.from('products').insert({
        id: Date.now(),
        name: form.name,
        description: form.description,
        details: form.details,
        price: Number(form.price),
        image_url: imageUrl,
        stock: Number(form.stock || 0),
        category: form.category,
        active: true
      })

      if (error) throw error

      setForm({
        name: '',
        description: '',
        details: '',
        price: '',
        stock: '1',
        category: 'Pietre Unicat',
        image_url: ''
      })

      setImageFile(null)
      await loadProducts()
      alert('Produs adăugat cu succes')
    } catch (err) {
      alert('Eroare: ' + err.message)
    }

    setSaving(false)
  }

  async function deleteProduct(id) {
    if (!confirm('Sigur vrei să ștergi produsul?')) return

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) alert(error.message)
    await loadProducts()
  }

  async function toggleActive(product) {
    const { error } = await supabase
      .from('products')
      .update({ active: !product.active })
      .eq('id', product.id)

    if (error) alert(error.message)
    await loadProducts()
  }

  function whatsapp(product) {
    const msg =
      'Bună ziua! Vreau să comand de pe NaturaLife.ro:\n\n' +
      '🛒 Produs: ' + product.name + '\n' +
      '📂 Categoria: ' + product.category + '\n' +
      '💰 Preț: ' + product.price + ' lei\n' +
      '📦 Cantitate: \n\n' +
      'Datele mele pentru comandă:\n' +
      '👤 Nume: \n' +
      '📞 Telefon: \n' +
      '🏠 Adresă livrare: \n\n' +
      'Mulțumesc!'

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
  }

  function email(product) {
    const subject = `Comandă NaturaLife - ${product.name}`
    const body =
      `Bună ziua,%0D%0A%0D%0A` +
      `Vreau să comand produsul: ${product.name}%0D%0A` +
      `Categoria: ${product.category}%0D%0A` +
      `Preț: ${product.price} lei%0D%0A%0D%0A` +
      `Nume:%0D%0ATelefon:%0D%0AAdresă:`

    return `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${body}`
  }

  async function shareProduct(product) {
    const text = `Vezi produsul ${product.name} pe NaturaLife.ro - ${product.price} lei`
    const url = window.location.href

    if (navigator.share) {
      await navigator.share({
        title: product.name,
        text,
        url
      })
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`)
      alert('Link copiat. Îl poți lipi pe Facebook, WhatsApp sau Messenger.')
    }
  }

  function openCategory(category) {
    setSelectedCategory(category)
    setSelectedProduct(null)

    setTimeout(() => {
      document.getElementById('produse')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  return (
    <div className="site">
      <header className="hero">
        <nav className="nav">
          <div className="brand"><span>🌿</span> NaturaLife</div>

          <div className="nav-links">
            <button onClick={() => openCategory('Toate')}>Acasă</button>
            <button onClick={() => openCategory('Pietre Unicat')}>Pietre Unicat</button>
            <button onClick={() => openCategory('Obiecte Lemn')}>Obiecte Lemn</button>
            <button onClick={() => openCategory('Căsuțe Păsărele')}>Căsuțe Păsărele</button>
            <button onClick={() => openCategory('Diverse')}>Diverse</button>
            <a href="#contact">Contact</a>
            <button onClick={() => setAdminOpen(!adminOpen)}>Admin</button>
          </div>
        </nav>

        <div className="hero-content">
          <p className="eyebrow">Produse naturale și obiecte unicat</p>
          <h1>Lucruri frumoase, alese din natură</h1>
          <p>Pietre unicat, obiecte din lemn, căsuțe pentru păsărele și produse diverse cu aspect premium.</p>
          <a className="primary" href="#produse">Vezi produsele</a>
        </div>
      </header>

      {adminOpen && (
        <section className="admin-panel">
          <h2>Panou administrator</h2>

          {!isAdmin ? (
            <div className="login-row">
              <input
                type="password"
                placeholder="Introdu parola de admin"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button onClick={loginAdmin}>Intră</button>
            </div>
          ) : (
            <>
              <div className="admin-tools">
                <h3>Schimbă parola admin</h3>
                <input
                  type="password"
                  placeholder="Parola veche"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Parola nouă"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
                <button onClick={changeAdminPassword}>Schimbă parola</button>
              </div>

              <form className="form" onSubmit={addProduct}>
                <input
                  placeholder="Nume produs"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />

                <input
                  placeholder="Preț, ex: 35"
                  type="number"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                />

                <input
                  placeholder="Stoc"
                  type="number"
                  value={form.stock}
                  onChange={e => setForm({ ...form, stock: e.target.value })}
                />

                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  <option value="Pietre Unicat">Pietre Unicat</option>
                  <option value="Obiecte Lemn">Obiecte Lemn</option>
                  <option value="Căsuțe Păsărele">Căsuțe Păsărele</option>
                  <option value="Diverse">Diverse</option>
                </select>

                <input
                  placeholder="Link poză, opțional"
                  value={form.image_url}
                  onChange={e => setForm({ ...form, image_url: e.target.value })}
                />

                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setImageFile(e.target.files?.[0] || null)}
                />

                <textarea
                  placeholder="Descriere scurtă pentru card"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />

                <textarea
                  placeholder="Detalii complete produs - apar când clientul deschide produsul"
                  value={form.details}
                  onChange={e => setForm({ ...form, details: e.target.value })}
                />

                <button disabled={saving}>
                  {saving ? 'Se salvează...' : 'Adaugă produs'}
                </button>
              </form>
            </>
          )}
        </section>
      )}

      <main id="produse" className="products-section">
        <div className="section-title">
          <p className="eyebrow dark">Magazin online</p>
          <h2>
            {selectedCategory === 'Toate'
              ? 'Toate produsele'
              : selectedCategory}
          </h2>
          <p>
            {selectedCategory === 'Toate'
              ? 'Aici apar toate produsele, din toate categoriile.'
              : `Aici apar produsele din categoria ${selectedCategory}.`}
          </p>
        </div>

        <div className="category-menu">
          {CATEGORIES.map(category => (
            <button
              key={category}
              className={selectedCategory === category ? 'active' : ''}
              onClick={() => openCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="empty">Se încarcă produsele...</p>
        ) : visibleProducts.length === 0 ? (
          <p className="empty">Nu există produse în această categorie.</p>
        ) : (
          <div className="grid">
            {visibleProducts.map(product => (
              <article className="card" key={product.id}>
                <div className="img-wrap" onClick={() => setSelectedProduct(product)}>
                  <img
                    src={product.image_url || 'https://images.unsplash.com/photo-1504545102780-26774c1bb073?auto=format&fit=crop&w=900&q=80'}
                    alt={product.name}
                  />
                </div>

                <div className="card-body">
                  <span className="tag">{product.category}</span>

                  <h3 onClick={() => setSelectedProduct(product)}>
                    {product.name}
                  </h3>

                  <p>{product.description}</p>

                  <div className="price-row">
                    <strong>{product.price} lei</strong>
                    <span>{product.stock > 0 ? `Stoc: ${product.stock}` : 'Indisponibil'}</span>
                  </div>

                  <div className="actions">
                    <a className="whatsapp" href={whatsapp(product)} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>

                    <button className="share" onClick={() => shareProduct(product)}>
                      Share
                    </button>
                  </div>

                  <button className="details-btn" onClick={() => setSelectedProduct(product)}>
                    Vezi detalii
                  </button>

                  {isAdmin && (
                    <div className="admin-actions">
                      <button onClick={() => toggleActive(product)}>
                        {product.active ? 'Ascunde' : 'Activează'}
                      </button>

                      <button className="danger" onClick={() => deleteProduct(product.id)}>
                        Șterge
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {selectedProduct && (
        <div className="modal-bg" onClick={() => setSelectedProduct(null)}>
          <div className="product-modal" onClick={e => e.stopPropagation()}>
            <button className="close" onClick={() => setSelectedProduct(null)}>×</button>

            <div className="modal-img">
              <img
                src={selectedProduct.image_url || 'https://images.unsplash.com/photo-1504545102780-26774c1bb073?auto=format&fit=crop&w=900&q=80'}
                alt={selectedProduct.name}
              />
            </div>

            <div className="modal-info">
              <span className="tag">{selectedProduct.category}</span>
              <h2>{selectedProduct.name}</h2>
              <strong className="modal-price">{selectedProduct.price} lei</strong>

              <p>{selectedProduct.description}</p>

              {selectedProduct.details && (
                <div className="details-text">
                  <h3>Detalii produs</h3>
                  <p>{selectedProduct.details}</p>
                </div>
              )}

              <p className="stock-info">
                {selectedProduct.stock > 0
                  ? `Disponibil în stoc: ${selectedProduct.stock}`
                  : 'Momentan indisponibil'}
              </p>

              <div className="modal-actions">
                <a className="whatsapp" href={whatsapp(selectedProduct)} target="_blank" rel="noreferrer">
                  Comandă pe WhatsApp
                </a>

                <a className="email" href={email(selectedProduct)}>
                  Email
                </a>

                <button className="share" onClick={() => shareProduct(selectedProduct)}>
                  Distribuie
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer id="contact">
        <h2>NaturaLife.ro</h2>
        <p>Comenzi pe WhatsApp sau email. Produse naturale, obiecte unicat și creații alese cu grijă.</p>
        <p>© {new Date().getFullYear()} NaturaLife</p>
      </footer>
    </div>
  )
}
