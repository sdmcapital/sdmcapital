#!/usr/bin/env python3
"""Genera y sube a R2 la versión Open Graph de las imágenes de portada que todavía no la tienen.

QUÉ HACE. Para cada propiedad (imagen_principal), cada showcase (primera foto del hero), cada artículo
publicado del blog (imagen_portada), la foto de «Quiénes somos» y las de servicios, SDM Rental y «Vende con nosotros» calcula la
clave `og/<clave>.jpg`; si ese objeto NO existe en R2, baja la original, la compone a 1200×630 JPEG
≤ 250 KB y la sube. Las Pages Functions (`functions/propiedades/[id].js` y `[id]/showcase.js`) usan esa
versión para `og:image`; si falta, caen a la imagen original SIN declarar dimensiones.

CUÁNDO CORRERLO. Después de crear o cambiar la portada de una propiedad, la foto del hero de un showcase,
la portada de un artículo del blog o la foto de «Quiénes somos». Es idempotente: lo que ya existe se salta.

    python3 scripts/generar-og-imagenes.py            # genera y sube lo que falte
    python3 scripts/generar-og-imagenes.py --solo-listar

REQUISITOS. Pillow (`pip install pillow`) y `npx wrangler` con la sesión de la cuenta de SDM Capital
(`npx wrangler whoami` → vurrutia@sdmcapital.cl, 184d514a05e9b756bd0a448ed96c6d38, y SIN
CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID en el entorno). Lee VITE_SUPABASE_URL y
VITE_SUPABASE_ANON_KEY de `.env` (lecturas anónimas).

COMPOSICIÓN. Foto apaisada (ancho/alto ≥ 1,35): recorte «cover» un poco hacia arriba. Cuadrada o
vertical (las «foto + texto SDM»): la foto entera, centrada, sobre su propio fondo desenfocado.
"""
import io, json, os, re, subprocess, sys, tempfile, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageFilter, ImageEnhance, ImageOps

W, H, MAX_KB = 1200, 630, 250
HOST = 'https://imagenes.sdmcapital.cl/'
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def env():
    d = {}
    for l in open(os.path.join(RAIZ, '.env')):
        if '=' in l and not l.startswith('#'):
            k, v = l.rstrip('\n').split('=', 1); d[k] = v
    return d

def get(url, headers=None, metodo='GET'):
    req = urllib.request.Request(url, headers=headers or {'User-Agent': 'Mozilla/5.0'}, method=metodo)
    return urllib.request.urlopen(req, timeout=60)

def clave_og(url):
    return 'og/' + re.sub(r'\.[A-Za-z0-9]+$', '', url[len(HOST):]) + '.jpg'

def existe(clave):
    try: return get(HOST + clave, metodo='HEAD').status == 200
    except Exception: return False

def componer(im):
    im = ImageOps.exif_transpose(im).convert('RGB'); w, h = im.size
    esc = max(W / w, H / h); nw, nh = round(w * esc), round(h * esc)
    if w / h >= 1.35:
        r = im.resize((nw, nh), Image.LANCZOS); x = (nw - W) // 2; y = round((nh - H) * 0.4)
        return r.crop((x, y, x + W, y + H))
    bg = im.resize((nw, nh), Image.LANCZOS).crop(((nw - W) // 2, (nh - H) // 2, (nw - W) // 2 + W, (nh - H) // 2 + H))
    bg = ImageEnhance.Brightness(bg.filter(ImageFilter.GaussianBlur(28))).enhance(0.55)
    e2 = H / h; fw, fh = round(w * e2), H
    if fw > W: e2 = W / w; fw, fh = W, round(h * e2)
    bg.paste(im.resize((fw, fh), Image.LANCZOS), ((W - fw) // 2, (H - fh) // 2)); return bg

def jpeg(im):
    for q in (84, 80, 76, 72, 68, 64, 60):
        buf = io.BytesIO(); im.save(buf, 'JPEG', quality=q, optimize=True, progressive=True)
        if len(buf.getvalue()) <= MAX_KB * 1024: break
    return buf.getvalue()

def main():
    e = env(); sb = e['VITE_SUPABASE_URL']; h = {'apikey': e['VITE_SUPABASE_ANON_KEY']}
    leer = lambda p: json.load(get(f'{sb}/rest/v1/{p}', h))
    urls = {r['imagen_principal'] for r in leer('propiedades?select=imagen_principal&limit=1000') if r.get('imagen_principal')}
    urls |= {r['img'] for r in leer('showcase_items?select=img&seccion=eq.hero&orden=eq.1&limit=1000') if r.get('img')}
    urls |= {r['imagen_portada'] for r in leer('blog_posts?select=imagen_portada&publicado=eq.true&limit=1000') if r.get('imagen_portada')}
    urls |= {r['valor'] for r in leer('contenido_sitio?select=valor&clave=eq.quienes_imagen_historia') if r.get('valor')}
    # Imágenes de las páginas compartibles que viven en contenido_sitio: servicios, SDM Rental y «Vende con nosotros».
    urls |= {r['valor'] for r in leer('contenido_sitio?select=valor&or=(clave.like.servicio_*_imagen,clave.eq.rental_hero_img,clave.eq.vende_hero_img)') if r.get('valor')}
    urls = sorted(u for u in urls if u.startswith(HOST))
    faltan = [u for u in urls if not existe(clave_og(u))]
    print(f'{len(urls)} imágenes de portada; faltan {len(faltan)} versiones OG')
    for u in faltan: print('  -', clave_og(u))
    if '--solo-listar' in sys.argv or not faltan: return
    def una(u):
        k = clave_og(u)
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as t:
            t.write(jpeg(componer(Image.open(io.BytesIO(get(u).read()))))); ruta = t.name
        p = subprocess.run(['npx', 'wrangler', 'r2', 'object', 'put', f'sdm-imagenes/{k}', '--file', ruta, '--content-type', 'image/jpeg',
                            '--cache-control', 'public, max-age=31536000, immutable', '--remote'], capture_output=True, text=True, cwd=RAIZ)
        os.unlink(ruta); return k, p.returncode == 0
    with ThreadPoolExecutor(4) as ex:
        for k, ok in ex.map(una, faltan): print('OK ' if ok else 'FALLA', k)

if __name__ == '__main__':
    main()
