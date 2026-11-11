"""Independently verify generated CSVs, subsets and person projections."""
import csv
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

root = Path(__file__).resolve().parent.parent
source = Path(sys.argv[1])
with source.open(encoding='utf-8-sig', newline='') as stream:
    reader = csv.reader(stream, delimiter=';', strict=True)
    header = next(reader)
    rows = list(reader)
report = []
for start, end in [(1954, 1961), (1961, 1969)]:
    page = root / f'Kreativní spolupráce {start}-{end % 100:02d}.html'
    html = page.read_text(encoding='utf-8')
    networks = json.loads(re.search(r'<script id="data" type="application/json">(.*?)</script>', html, re.S)[1])
    assert len(networks) == 6
    canonical = {edge['pozice_kat'].casefold(): edge['pozice_kat'] for edge in networks[0]['edges']}
    expected = set()
    for row in rows:
        year = re.fullmatch(r'(\d{4})(?:[.,]0+)?', row[12].strip())
        if year and start <= int(year[1]) <= end:
            assert (row[2], row[5], row[6], row[10]) == ('film', 'fyzicka_osoba', 'stab', '1')
            expected.add((row[0], row[3], canonical[row[8].strip().casefold()], row[7], 'Directed'))
    assert {tuple(edge.values()) for edge in networks[0]['edges']} == expected
    full_nodes = {node['Id']: node for node in networks[0]['nodes']}
    for network in networks:
        nodes, edges = network['nodes'], network['edges']
        ids = {node['Id'] for node in nodes}
        assert len(ids) == len(nodes)
        assert len({tuple(edge.items()) for edge in edges}) == len(edges)
        for node in nodes:
            for field, value in node.items():
                assert value == full_nodes[node['Id']].get(field, ''), (node['Id'], field)
        for edge in edges:
            assert edge['Source'] in ids and edge['Target'] in ids
            assert edge['Source'] != edge['Target']
        for kind in ('nodes', 'edges'):
            path = root / 'outputs' / 'csv' / f'{start}-{end}' / network['folder'] / f'{kind}.csv'
            with path.open(encoding='utf-8-sig', newline='') as stream:
                assert list(csv.DictReader(stream)) == network[kind], path
        subset = 'creative' if network['folder'].startswith('Creatives') else (
            'production' if network['folder'].startswith('Production') else 'all')
        source_net = next(item for item in networks if item['directed'] and (
            item['folder'].startswith('Creatives') if subset == 'creative' else
            item['folder'].startswith('Production') if subset == 'production' else
            item['folder'].startswith('Film-Osoba')))
        allowed = {'Hudba', 'Námět', 'Režie', 'Scénář', 'Výtvarník'} if subset == 'creative' else (
            {'Režie', 'Animace', 'Produkce'} if subset == 'production' else canonical.values())
        assert {tuple(edge.values()) for edge in source_net['edges']} == {
            edge for edge in expected if edge[2] in allowed}
        person_films = defaultdict(set)
        for edge in source_net['edges']:
            person_films[edge['Target']].add(edge['Source'])
        if network['directed']:
            assert ids == {edge[field] for edge in edges for field in ('Source', 'Target')}
            assert all(full_nodes[edge['Source']]['Type'] == 'Film' and
                       full_nodes[edge['Target']]['Type'] == 'Osoba' for edge in edges)
            assert all(start <= float(node['rok_vyroby']) <= end for node in nodes if node['Type'] == 'Film')
        else:
            assert ids == set(person_films)
            expected_pairs = {}
            people = sorted(person_films, key=int)
            for index, a in enumerate(people):
                for b in people[index + 1:]:
                    films = person_films[a] & person_films[b]
                    if films:
                        expected_pairs[a, b] = films
            assert len(expected_pairs) == len(edges)
            for edge in edges:
                films = expected_pairs.pop((edge['Source'], edge['Target']))
                assert set(edge['Shared_Films'].split('|')) == films
                assert int(edge['Weight']) == len(films)
                for person_index, person in enumerate((edge['Source'], edge['Target']), 1):
                    for field, source_field in [('Kat', 'pozice_kat'), ('Orig', 'pozice_orig')]:
                        key = f'P{person_index}_Roles_{field}'
                        if key in edge:
                            expected_roles = [', '.join(sorted({credit[source_field] for credit in source_net['edges']
                                if credit['Source'] == film and credit['Target'] == person and credit[source_field]}))
                                for film in edge['Shared_Films'].split('|')]
                            assert edge[key] == '|'.join(expected_roles)
            assert not expected_pairs
        report.append(dict(network=network['folder'], nodes=len(nodes), edges=len(edges), result='PASS'))
        print(network['folder'], 'PASS', flush=True)

index = (root / 'index.html').read_text(encoding='utf-8')
from urllib.parse import unquote
for href in re.findall(r'href="([^"]+)"', index):
    assert (root / unquote(href)).is_file(), href
(root / 'outputs' / 'kontrola-1954-1969' / 'datova-kontrola.json').write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
