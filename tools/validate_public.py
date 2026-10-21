"""Read-only, dependency-free checks for this buildless static site.
Run: python tools/validate_public.py
"""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PAGES = ['index', 'about', 'services', 'portfolio', 'contact', 'privacy', 'cookies', 'terms']


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []
        self.ids = set()
        self.jsonld = []
        self.buffer = None

    def handle_starttag(self, tag, attrs):
        names = [key for key, _ in attrs]
        assert len(names) == len(set(names)), f'Duplicate attributes: {tag}'
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, f'Duplicate ID: {attrs["id"]}'
            self.ids.add(attrs['id'])
        if tag == 'script' and attrs.get('type') == 'application/ld+json':
            self.buffer = ''

    def handle_data(self, data):
        if self.buffer is not None:
            self.buffer += data

    def handle_endtag(self, tag):
        if tag == 'script' and self.buffer is not None:
            self.jsonld.append(json.loads(self.buffer))
            self.buffer = None


pages = {}
for name in PAGES + ['404']:
    page = Page()
    page.feed((ROOT / f'{name}.html').read_text())
    pages[name] = page
    assert sum(tag == 'h1' for tag, _ in page.tags) == 1, name
    for tag, attrs in page.tags:
        for attr in ['href', 'src']:
            value = attrs.get(attr, '')
            if not value.startswith('/') or value.startswith('//'):
                continue
            path = urlsplit(value).path
            target = ROOT / path.lstrip('/') if path != '/' else ROOT / 'index.html'
            if not target.suffix:
                target = target.with_suffix('.html')
            assert target.is_file(), f'{name}: missing {value}'
        if tag == 'a' and attrs.get('target') == '_blank':
            assert 'noopener' in attrs.get('rel', ''), f'{name}: unsafe new-tab link'
    if name in PAGES:
        canon = [a['href'] for t, a in page.tags if t == 'link' and a.get('rel') == 'canonical']
        assert canon == ['https://creativehaider.vercel.app/' + ('' if name == 'index' else name)], name
        assert page.jsonld, name
        assert any(t == 'meta' and a.get('name') == 'description' and a.get('content') for t, a in page.tags), name
        assert not any(t == 'meta' and a.get('name') == 'robots' and 'noindex' in a.get('content', '') for t, a in page.tags), name

ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
urls = [el.text for el in ET.parse(ROOT / 'sitemap.xml').findall('s:url/s:loc', ns)]
expected = {'https://creativehaider.vercel.app/' + ('' if page == 'index' else page) for page in PAGES}
assert set(urls) == expected
assert 'Sitemap: https://creativehaider.vercel.app/sitemap.xml' in (ROOT / 'robots.txt').read_text()

for name in ['index', 'login']:
    admin_page = (ROOT / f'admin/{name}.html').read_text().lower().replace(' ', '')
    assert 'noindex,nofollow' in admin_page

print('PASS: public markup, assets, metadata, JSON-LD syntax, sitemap, new-tab safety, and admin noindex.')
