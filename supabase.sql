-- 1. Creează tabelele în Supabase SQL Editor
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  price numeric not null,
  image_url text,
  status text not null default 'available', -- available / unavailable
  created_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),
  product_name text not null,
  customer_name text not null,
  phone text not null,
  address text not null,
  notes text,
  status text not null default 'new',
  created_at timestamptz default now()
);

-- 2. Storage bucket pentru poze
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- 3. Activăm Row Level Security
alter table products enable row level security;
alter table orders enable row level security;

-- 4. Politici simple pentru început
-- Oricine poate vedea produsele
create policy "public can read products"
on products for select
using (true);

-- Oricine poate face comandă
create policy "public can create orders"
on orders for insert
with check (true);

-- Oricine poate citi pozele publice
create policy "public can read images"
on storage.objects for select
using (bucket_id = 'product-images');

-- ATENȚIE: politicile de mai jos permit admin din aplicație cu parolă simplă.
-- Pentru magazin serios, se recomandă autentificare Supabase Auth.
create policy "public can insert products"
on products for insert
with check (true);

create policy "public can update products"
on products for update
using (true);

create policy "public can delete products"
on products for delete
using (true);

create policy "public can upload product images"
on storage.objects for insert
with check (bucket_id = 'product-images');

create policy "public can update product images"
on storage.objects for update
using (bucket_id = 'product-images');
