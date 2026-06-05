#!/usr/bin/env python3
"""serve.py — Serveur de développement local SANS cache.

Pourquoi : `python -m http.server` ne renvoie aucun en-tête `Cache-Control`.
Le navigateur met alors en cache les modules ES de façon heuristique et continue
de servir d'ANCIENNES versions des fichiers après modification — d'où des bugs
fantômes (ex. une propriété récemment ajoutée qui apparaît « undefined »).

Ce petit lanceur force `Cache-Control: no-store` : chaque rechargement repart
des fichiers à jour. Pur Python, aucune dépendance.

Usage :
    python serve.py            # port 8000 par défaut
    python serve.py 8080       # port personnalisé
    puis ouvrir http://localhost:<port>/

Pour un simple essai (sans édition en cours), `python -m http.server` suffit.
"""

import sys
import http.server
import socketserver


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Empêche toute mise en cache (modules ES inclus) en développement.
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()


class ReusableServer(socketserver.TCPServer):
    allow_reuse_address = True  # évite « address already in use » au redémarrage


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    with ReusableServer(("", port), NoCacheHandler) as httpd:
        print(f"Serveur de dev sans cache : http://localhost:{port}/")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nArrêt du serveur.")


if __name__ == "__main__":
    main()
