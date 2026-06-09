import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const WHATSAPP_NUMBER = '40753921023'
const EMAIL = 'bursasiu_1@yahoo.com'
const ADMIN_PASSWORD = 'admin123'

export default function App() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [adminOpen, setAdminOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [password, setPassword] = useState('')
  const [category, setCategory] = useState('Toate')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', price: '', stock: '1', category: 'Ciuperci', image_url: ''
  })
  const [imageFile, setImageFile] = useState(null)

  useEffect(() => { loadProducts() }, [])

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

  const categories = useMemo(() => {
    const list = products.map(p => p.category).filter(Boolean)
    return ['Toate', ...new Set(list)]
  }, [products])

  const visibleProducts = products.filter(p => p.active !== false && (category === 'Toate' || p.category === category))

  function loginAdmin() {
    if (password === ADMIN_PASSWORD) setIsAdmin(true)
    else alert('Parolă greșită')
  }

  async function uploadImage() {
    if (!imageFile) return form.image_url
    const ext = imageFile.name.split('.').pop()
    const fileName = `${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('products').upload(fileName, imageFile)
    if (error) throw error
    const { data } = supabase.storage.from('products').getPublicUrl(fileName)
    return data.publicUrl
  }

  async function addProduct(e) {
    e.preventDefault()
    if (!form.name || !form.price) return alert('Completează numele și prețul')
    setSaving(true)
    try {
      const imageUrl = await uploadImage()
      const { error } = await supabase.from('products').insert({
        id: Date.now(),
        name: form.name,
        description: form.description,
        price: Number(form.price),
        image_url: imageUrl,
        stock: Number(form.stock || 0),
        category: form.category,
        active: true,
      })
      if (error) throw error
      setForm({ name: '', description: '', price: '', stock: '1', category: 'Ciuperci', image_url: '' })
      setImageFile(null)
      await loadProducts()
    } catch (err) {
      alert('Eroare: ' + err.message)
    }
    setSaving(false)
  }

  async function deleteProduct(id) {
    if (!confirm('Ștergi produsul?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) alert(error.message)
    await loadProducts()
  }

  async function toggleActive(product) {
    const { error } = await supabase.from('products').update({ active: !product.active }).eq('id', product.id)
    if (error) alert(error.message)
    await loadProducts()
  }

  function whatsapp(product) {
    const msg =
      'Bună ziua! Vreau să comand de pe NaturaLife.ro:\n\n' +
      '🛒 Produs: ' + product.name + '\n' +
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
    const body = `Bună ziua,%0D%0A%0D%0AVreau să comand produsul: ${product.name}%0D%0APreț: ${product.price} lei%0D%0A%0D%0ANume:%0D%0ATelefon:%0D%0AAdresă:`
    return `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${body}`
  }

  return (
    <div className="site">
      <header className="hero">
        <nav className="nav">
          <div className="brand"><span>🌿</span> NaturaLife</div>
          <div className="nav-links">
            <a href="#produse">Produse</a>
            <a href="#contact">Contact</a>
            <button onClick={() => setAdminOpen(!adminOpen)}>Admin</button>
          </div>
        </nav>
        <div className="hero-content">
          <p className="eyebrow">Produse naturale</p>
          <h1>Gusturi curate din natură</h1>
          <p>Ciuperci uscate, plante, bunătăți tradiționale și produse naturale atent alese.</p>
          <a className="primary" href="#produse">Vezi produsele</a>
        </div>
      </header>

      {adminOpen && <section className="admin-panel">
        <h2>Panou administrator</h2>
        {!isAdmin ? <div className="login-row">
          <input type="password" placeholder="Parola admin" value={password} onChange={e => setPassword(e.target.value)} />
          <button onClick={loginAdmin}>Intră</button>
          <small>Parola inițială: admin123</small>
        </div> : <form className="form" onSubmit={addProduct}>
          <input placeholder="Nume produs" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <input placeholder="Preț, ex: 35" type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
          <input placeholder="Stoc" type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} />
          <input placeholder="Categorie" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
          <input placeholder="Link poză, opțional" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} />
          <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
          <textarea placeholder="Descriere" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          <button disabled={saving}>{saving ? 'Se salvează...' : 'Adaugă produs'}</button>
        </form>}
      </section>}

      <main id="produse" className="products-section">
        <div className="section-title">
          <p className="eyebrow dark">Magazin online</p>
          <h2>Produsele noastre</h2>
        </div>
        <div className="filters">
          {categories.map(c => <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>)}
        </div>
        {loading ? <p className="empty">Se încarcă produsele...</p> : visibleProducts.length === 0 ? <p className="empty">Nu există produse încă. Intră la Admin și adaugă primul produs.</p> : <div className="grid">
          {visibleProducts.map(p => <article className="card" key={p.id}>
            <div className="img-wrap"><img src={p.image_url || 'https://images.unsplash.com/photo-1504545102780-26774c1bb073?auto=format&fit=crop&w=900&q=80'} alt={p.name} /></div>
            <div className="card-body">
              <span className="tag">{p.category}</span>
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <div className="price-row"><strong>{p.price} lei</strong><span>{p.stock > 0 ? `Stoc: ${p.stock}` : 'Indisponibil'}</span></div>
              <div className="actions">
                <a className="whatsapp" href={whatsapp(p)} target="_blank">Comandă WhatsApp</a>
                <a className="email" href={email(p)}>Email</a>
              </div>
              {isAdmin && <div className="admin-actions">
                <button onClick={() => toggleActive(p)}>{p.active ? 'Ascunde' : 'Activează'}</button>
                <button className="danger" onClick={() => deleteProduct(p.id)}>Șterge</button>
              </div>}
            </div>
          </article>)}
        </div>}
      </main>

      <footer id="contact">
        <h2>NaturaLife.ro</h2>
        <p>Comenzi pe WhatsApp sau email. Produse naturale, alese cu grijă.</p>
        <p>© {new Date().getFullYear()} NaturaLife</p>
      </footer>
    </div>
  )
}
