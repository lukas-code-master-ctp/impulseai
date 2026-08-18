#!/usr/bin/env python3
"""Servidor local que imita el comportamiento de Vercel.

El sitio usa URLs limpias (`/cierra`, no `/cierra.html`), asi que
`python -m http.server` ya no sirve: devolveria 404. Este servidor
replica las dos reglas de `vercel.json`:

  cleanUrls      -> /cierra sirve cierra.html, y /cierra.html redirige a /cierra
  trailingSlash  -> /cierra/ redirige a /cierra

Uso:  python dev-server.py [puerto]
"""

import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PUERTO = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
RAIZ = os.path.dirname(os.path.abspath(__file__))


class CleanUrlHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        ruta, _, consulta = self.path.partition('?')

        # trailingSlash: false — /cierra/ pasa a ser /cierra
        if len(ruta) > 1 and ruta.endswith('/'):
            sin_barra = ruta.rstrip('/')
            if os.path.isfile(self.archivo(sin_barra + '.html')):
                return self.redirigir(sin_barra, consulta)

        # cleanUrls — /cierra.html pasa a ser /cierra
        if ruta.endswith('.html'):
            destino = '/' if ruta == '/index.html' else ruta[:-len('.html')]
            return self.redirigir(destino, consulta)

        # cleanUrls — /cierra sirve cierra.html
        if not os.path.splitext(ruta)[1] and ruta != '/':
            if os.path.isfile(self.archivo(ruta + '.html')):
                self.path = ruta + '.html' + (('?' + consulta) if consulta else '')

        return SimpleHTTPRequestHandler.send_head(self)

    def archivo(self, ruta_url):
        return os.path.join(RAIZ, ruta_url.lstrip('/').replace('/', os.sep))

    def redirigir(self, destino, consulta=''):
        self.send_response(308)
        self.send_header('Location', destino + (('?' + consulta) if consulta else ''))
        self.send_header('Content-Length', '0')
        self.end_headers()
        return None

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        SimpleHTTPRequestHandler.end_headers(self)

    def log_message(self, formato, *args):
        sys.stderr.write('%s - %s\n' % (self.address_string(), formato % args))


if __name__ == '__main__':
    handler = partial(CleanUrlHandler, directory=RAIZ)
    with ThreadingHTTPServer(('127.0.0.1', PUERTO), handler) as httpd:
        print('Impulse AI en http://localhost:%d (URLs limpias)' % PUERTO, flush=True)
        httpd.serve_forever()
