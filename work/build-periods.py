"""Build the next periods from source credits using the current HTML as template."""
import csv
import hashlib
import json
import re
import sys
import subprocess
from collections import Counter, defaultdict
from itertools import combinations
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path(sys.argv[1])
PERIODS = [tuple(map(int, period.split('-'))) for period in sys.argv[2:]] or [(1954, 1961), (1961, 1969)]
REPORT_NAME = f'kontrola-{PERIODS[0][0]}-{PERIODS[-1][1]}'
PATTERN = re.compile(r'(<script id="data" type="application/json">)(.*?)(</script>)', re.S)
template_path = ROOT / 'Kreativní spolupráce 1948-54.html'
template = template_path.read_text(encoding='utf-8')
reference = json.loads(PATTERN.search(template)[2])
with SOURCE.open(encoding='utf-8-sig', newline='') as stream:
    reader = csv.reader(stream, delimiter=';', strict=True)
    header = next(reader)
    source_rows = list(enumerate(reader, 2))
assert header[8] == 'pozice_kat' and header[12] == 'rok_vyroby'
known_roles = {edge['pozice_kat'].casefold(): edge['pozice_kat']
               for edge in reference[0]['edges']}
creative_roles = {'Hudba', 'Námět', 'Režie', 'Scénář', 'Výtvarník'}
production_roles = {'Režie', 'Animace', 'Produkce'}
duplicate_report = []
normalization_report = []
summary = []


def number_key(value):
    return int(value)


def write_csv(path, fields, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.DictWriter(stream, fields)
        writer.writeheader()
        writer.writerows(rows)
    with path.open(encoding='utf-8-sig', newline='') as stream:
        actual = list(csv.DictReader(stream))
    assert actual == [{field: str(row.get(field, '')) for field in fields} for row in rows], path


def project(credits, detailed):
    films = defaultdict(lambda: defaultdict(lambda: (set(), set())))
    for edge in credits:
        roles, originals = films[edge['Source']][edge['Target']]
        roles.add(edge['pozice_kat'])
        if edge['pozice_orig']:
            originals.add(edge['pozice_orig'])
    shared = defaultdict(list)
    for film in sorted(films, key=number_key):
        for pair in combinations(sorted(films[film], key=number_key), 2):
            shared[pair].append(film)
    edges = []
    for (a, b), film_ids in sorted(shared.items(), key=lambda item: tuple(map(int, item[0]))):
        edge = dict(Source=a, Target=b, Weight=str(len(film_ids)),
                    Shared_Films='|'.join(film_ids), Type='Undirected')
        if detailed:
            for index, person in enumerate((a, b), 1):
                for role_index, suffix in enumerate(('Kat', 'Orig')):
                    edge[f'P{index}_Roles_{suffix}'] = '|'.join(
                        ', '.join(sorted(films[film][person][role_index])) for film in film_ids)
        edges.append(edge)
    return edges


for start, end in PERIODS:
    short = f'{start % 100:02d}-{end % 100:02d}'
    period = f'{start}-{end}'
    selected = []
    for row_number, row in source_rows:
        year = re.fullmatch(r'(\d{4})(?:[.,]0+)?', row[12].strip())
        if year and start <= int(year[1]) <= end:
            assert len(row) == len(header)
            assert (row[2], row[5], row[6], row[10]) == ('film', 'fyzicka_osoba', 'stab', '1')
            selected.append((row_number, row))
    catalog = {}
    seen = {}
    credits = []
    duplicate_count = 0
    for row_number, row in selected:
        film, person = row[0], row[3]
        assert film and person and film != person
        for id, label, kind, fields, values in [
            (film, row[1], 'Film', header[12:20], row[12:20]),
            (person, row[4], 'Osoba', header[20:25], row[20:25]),
        ]:
            node = catalog.setdefault(id, dict(Id=id, Label=label, Type=kind))
            assert (node['Label'], node['Type']) == (label, kind), (id, row_number)
            for field, value in zip(fields, values):
                if not node.get(field):
                    node[field] = value
                elif value:
                    assert node[field] == value, (id, field, row_number)
        raw_role = row[8].strip()
        role = known_roles.get(raw_role.casefold(), raw_role)
        assert role
        if role != row[8]:
            normalization_report.append(dict(period=period, source_record=row_number,
                                             original=row[8], normalized=role))
        edge = dict(Source=film, Target=person, pozice_kat=role,
                    pozice_orig=row[7], Type='Directed')
        key = tuple(edge.values())
        if key in seen:
            duplicate_count += 1
            kept_number, kept_row = seen[key]
            duplicate_report.append(dict(
                period=period, film_id=film, film=row[1], person_id=person, person=row[4],
                pozice_kat=role, pozice_orig=row[7], kept_source_record=kept_number,
                removed_source_record=row_number,
                full_source_row_identical=str(kept_row == row).lower(),
                action='Ponechán první shodný film–osoba–kategorie–původní pozice; opakovaná hrana vynechána.'))
            continue
        seen[key] = row_number, row
        credits.append(edge)

    subsets = {
        'all': credits,
        'creative': [edge for edge in credits if edge['pozice_kat'] in creative_roles],
        'production': [edge for edge in credits if edge['pozice_kat'] in production_roles],
    }
    networks = []
    for ref in reference:
        old_folder = ref['folder']
        subset_name = 'creative' if old_folder.startswith('Creatives') else (
            'production' if old_folder.startswith('Production') else 'all')
        source_edges = subsets[subset_name]
        edges = source_edges if ref['directed'] else project(source_edges, subset_name != 'creative')
        ids = {edge['Target'] for edge in source_edges}
        if ref['directed']:
            ids.update(edge['Source'] for edge in source_edges)
        node_fields = list(ref['nodes'][0])
        edge_fields = list(ref['edges'][0])
        nodes = [{field: catalog[id].get(field, '') for field in node_fields}
                 for id in sorted(ids, key=number_key)]
        edges = [{field: edge[field] for field in edge_fields} for edge in edges]
        folder = old_folder.replace('48-54', short)
        network = dict(folder=folder, title=ref['title'], directed=ref['directed'], nodes=nodes, edges=edges)
        networks.append(network)
        target = ROOT / 'outputs' / 'csv' / period / folder
        write_csv(target / 'nodes.csv', node_fields, nodes)
        write_csv(target / 'edges.csv', edge_fields, edges)
        assert len(ids) == len(nodes)
        assert all(edge['Source'] in ids and edge['Target'] in ids for edge in edges)
        assert len({tuple(edge.values()) for edge in edges}) == len(edges)
        summary.append(dict(period=period, network=folder, nodes=len(nodes), edges=len(edges)))

    page = template.replace('1948-54', f'{start}-{end % 100:02d}').replace('48-54', short)
    payload = json.dumps(networks, ensure_ascii=False, separators=(',', ':')).replace('<', r'\u003c')
    page = PATTERN.sub(lambda match: match[1] + payload + match[3], page, count=1)
    palette = re.search(r'const colors=new Map\(Object.entries\((.*?)\)\);', page)
    mapping = json.loads(palette[1])
    missing = sorted({edge['pozice_kat'] for edge in credits} - mapping.keys())
    extra_colors = ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3']
    assert len(missing) <= len(extra_colors)
    mapping.update(zip(missing, extra_colors))
    page = page[:palette.start(1)] + json.dumps(mapping, ensure_ascii=True, separators=(',', ':')) + page[palette.end(1):]
    target = ROOT / f'Kreativní spolupráce {start}-{end % 100:02d}.html'
    target.write_text(page, encoding='utf-8')
    print(period, 'source', len(selected), 'cleaned', len(credits), 'duplicates', duplicate_count)
    for line in summary:
        if line['period'] == period:
            print(line)

report_dir = ROOT / 'outputs' / REPORT_NAME
write_csv(report_dir / 'duplicity.csv', list(duplicate_report[0]), duplicate_report)
if normalization_report:
    write_csv(report_dir / 'sjednoceni-kategorii.csv', list(normalization_report[0]), normalization_report)
write_csv(report_dir / 'pocty-siti.csv', list(summary[0]), summary)
report = [
    '# Kontrola sítí ' + ' a '.join(f'{start}–{end}' for start, end in PERIODS), '',
    f'Zdrojový soubor `{SOURCE.name}`. SHA-256 `{hashlib.sha256(SOURCE.read_bytes()).hexdigest()}`.', '',
    'Období zahrnují oba krajní roky. Překrývající se roky jsou zahrnuty v každém příslušném období.', '',
    'Použity jsou vztahy film → fyzická osoba, typ `stab`, příznak Dataset Animace = 1 a rok výroby ve sloupci M. Pole za sloupcem Y nejsou součástí síťových záznamů.', '',
    'Kreativní profese zahrnují Hudba, Námět, Režie, Scénář, Výtvarník. Produkční výběr zahrnuje Režie, Animace, Produkce. Kategorie s příponou -other se do těchto užších výběrů nezařazují.', '',
    '## Duplicity', '',
    'Zachován je první záznam pro shodný film, osobu, kategorii a původní pozici. Opakovaná hrana se vynechá, žádná osoba ani odlišná pracovní pozice se neslučuje. Čísla jsou pořadí CSV záznamů včetně záhlaví (záhlaví = 1).', '',
    'Každá odstraněná kopie je uvedena v `duplicity.csv`. V projekci osoba–osoba se lidé v rámci jednoho filmu počítají jednou a váha hrany je počet různých společných filmů.', '',
]
for duplicate in duplicate_report:
    report.append(f"- {duplicate['period']} · {duplicate['film']} (ID {duplicate['film_id']}) · {duplicate['person']} (ID {duplicate['person_id']}) · {duplicate['pozice_kat']} / {duplicate['pozice_orig']} · ponechán záznam {duplicate['kept_source_record']}, odstraněn {duplicate['removed_source_record']}.")
report += ['', '## Počty', '', '| Období | Síť | Uzly | Hrany |', '|---|---|---:|---:|']
for line in summary:
    report.append(f"| {line['period']} | {line['network']} | {line['nodes']} | {line['edges']} |")
(report_dir / 'kontrola.md').write_text('\n'.join(report) + '\n', encoding='utf-8')

index_path = ROOT / 'index.html'
index = index_path.read_text(encoding='utf-8')
for start, end in PERIODS:
    label = f'{start}–{end}'
    href = f'Kreativn%C3%AD%20spolupr%C3%A1ce%20{start}-{end % 100:02d}.html'
    if href not in index:
        index = index.replace('  </nav>', f'    <a href="{href}">{label}</a>\n  </nav>')
index_path.write_text(index, encoding='utf-8')
subprocess.run(['node', str(ROOT / 'work' / 'precompute-layouts.cjs')], cwd=ROOT, check=True)
