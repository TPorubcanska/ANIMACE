# Kontrola sítí 1954–1961 a 1961–1969

Zdrojový soubor `source data.csv`. SHA-256 `453fcdd32060661df90bdc638418c277f33c3c4d610123b49c1fad5167d4dbf2`.

Období zahrnují oba krajní roky. Rok 1961 je proto v obou nových obdobích. Rok 1954 navazuje překryvem na předchozí období.

Použity jsou vztahy film → fyzická osoba, typ `stab`, příznak Dataset Animace = 1 a rok výroby ve sloupci M. Pole za sloupcem Y nejsou součástí síťových záznamů.

Kreativní profese zahrnují Hudba, Námět, Režie, Scénář, Výtvarník. Produkční výběr zahrnuje Režie, Animace, Produkce. Kategorie s příponou -other se do těchto užších výběrů nezařazují.

## Duplicity

Zachován je první záznam pro shodný film, osobu, kategorii a původní pozici. Opakovaná hrana se vynechá, žádná osoba ani odlišná pracovní pozice se neslučuje. Čísla jsou pořadí CSV záznamů včetně záhlaví (záhlaví = 1).

Každá odstraněná kopie je uvedena v `duplicity.csv`. V projekci osoba–osoba se lidé v rámci jednoho filmu počítají jednou a váha hrany je počet různých společných filmů.

- 1954-1961 · Baron Prášil (ID 1640) · Jiří Brdečka (ID 565) · Scénář-other / Autor komentáře · ponechán záznam 2942, odstraněn 2943.
- 1954-1961 · Baron Prášil (ID 1640) · Jiří Tarantík (ID 2908) · Kamera / Kamera · ponechán záznam 2948, odstraněn 2949.
- 1954-1961 · Bystrouška vyvlastňuje (ID 844) · Leoš Janáček (ID 846) · Scénář-other / Autor předlohy · ponechán záznam 4127, odstraněn 4128.
- 1954-1961 · Bystrouška vyvlastňuje (ID 844) · Leoš Janáček (ID 846) · Scénář-other / Autor předlohy · ponechán záznam 4127, odstraněn 4130.
- 1954-1961 · Tragedie vodníkova (ID 1111) · Jana Šebestíková (ID 569) · Střih / Střihač · ponechán záznam 29371, odstraněn 29372.
- 1954-1961 · Už je ráno (ID 918) · Josef Čapek (ID 873) · Scénář-other / Autor předlohy · ponechán záznam 30385, odstraněn 30386.
- 1954-1961 · Věneček písní (ID 1158) · Míla Bráníková (ID 1153) · Kamera / Kamera · ponechán záznam 31187, odstraněn 31188.
- 1954-1961 · Vláček Kolejáček (ID 1586) · František Hrubín (ID 591) · Scénář-other / Autor komentáře · ponechán záznam 31393, odstraněn 31394.
- 1954-1961 · Vláček Kolejáček (ID 1586) · Karel Höger (ID 869) · Mluví / Komentář čte · ponechán záznam 31399, odstraněn 31400.
- 1954-1961 · Zvědavé psaníčko (ID 1343) · Hermína Týrlová (ID 91) · Scénář / Scénář · ponechán záznam 33270, odstraněn 33271.
- 1954-1961 · Železný klobouk (ID 720) · Jan Bedřich (ID 625) · Hudba / Hudba · ponechán záznam 33400, odstraněn 33401.
- 1961-1969 · Baron Prášil (ID 1640) · Jiří Brdečka (ID 565) · Scénář-other / Autor komentáře · ponechán záznam 2942, odstraněn 2943.
- 1961-1969 · Baron Prášil (ID 1640) · Jiří Tarantík (ID 2908) · Kamera / Kamera · ponechán záznam 2948, odstraněn 2949.
- 1961-1969 · Medvídek na cestách (ID 11853) · Antonín Horák (ID 74) · Kamera / Kamera · ponechán záznam 12949, odstraněn 12950.
- 1961-1969 · Jediná radost (ID 748) · Jaroslav Válek (ID 750) · Mluví / Komentář čte · ponechán záznam 12981, odstraněn 12982.
- 1961-1969 · Medvídkovo nočné dobrodružstvo (ID 11856) · Antonín Horák (ID 74) · Kamera / Kamera · ponechán záznam 13079, odstraněn 13081.
- 1961-1969 · Hlídač snů (ID 1227) · Antonín Štrojsa (ID 141) · Střih / Střihač · ponechán záznam 13869, odstraněn 14004.
- 1961-1969 · Hruška (ID 11857) · Garik Seko (ID 417) · Námět / Námět · ponechán záznam 14018, odstraněn 14019.
- 1961-1969 · Krtek zahradníkem (ID 548) · Jiří Šebestík (ID 562) · Produkce / Vedoucí produkce/Vedoucí výroby · ponechán záznam 15228, odstraněn 15229.
- 1961-1969 · Škvorec spachtoško (ID 11976) · Jan Iván (ID 1123) · Scénář / Scénář · ponechán záznam 28532, odstraněn 28533.
- 1961-1969 · Zvědavé psaníčko (ID 1343) · Hermína Týrlová (ID 91) · Scénář / Scénář · ponechán záznam 33270, odstraněn 33271.
- 1961-1969 · Železný klobouk (ID 720) · Jan Bedřich (ID 625) · Hudba / Hudba · ponechán záznam 33400, odstraněn 33401.

## Počty

| Období | Síť | Uzly | Hrany |
|---|---|---:|---:|
| 1954-1961 | Film-Osoba54-61 | 591 | 2086 |
| 1954-1961 | Collab54-61_Osoba-Osoba | 446 | 8560 |
| 1954-1961 | Creatives54-61 | 305 | 690 |
| 1954-1961 | CreativesCollab54-61 | 160 | 513 |
| 1954-1961 | Production54-61_Film-Osoba | 237 | 519 |
| 1954-1961 | Production54-61_Osoba-Osoba | 92 | 547 |
| 1961-1969 | Film-Osoba61-69 | 1035 | 4477 |
| 1961-1969 | Collab61-69_Osoba-Osoba | 584 | 8621 |
| 1961-1969 | Creatives61-69 | 685 | 1889 |
| 1961-1969 | CreativesCollab61-69 | 234 | 713 |
| 1961-1969 | Production61-69_Film-Osoba | 580 | 1229 |
| 1961-1969 | Production61-69_Osoba-Osoba | 130 | 544 |

## Výsledek kontrol

- Všech 24 CSV bylo zpětně načteno a přesně porovnáno s daty uloženými v HTML.
- Obě období mají šest sítí. ID uzlů jsou jedinečná, všechny konce hran existují a směrované hrany vedou od filmu k osobě.
- Roky filmů odpovídají příslušným obdobím. Atributy uzlů neobsahují žádné rozpory proti zdrojovým řádkům.
- Kreativní a produkční výběry přesně odpovídají stanoveným kategoriím v úplné síti.
- Projekce osoba–osoba byly nezávisle zkontrolovány pomocí průniků množin filmů každé dvojice osob. Váhy i seznamy společných filmů a připojené role souhlasí.
- Syntaxe JavaScriptu a výpočet centrality prošly kontrolou na řetězci, hvězdě, trojúhelníku, grafu s izolovaným uzlem a při vypnutých hranách.
- V Edge prošlo všech 12 karet. Kontrolováno bylo přepínání metrik, reset původních poloh, vypnutí hran, filtr jedné kategorie, ForceAtlas2 nad filtrem, informace o uzlu a SVG náhled s panelem i bez legendy.
- Ověřeno bylo také světlé zobrazení, zbalení panelu, celoobrazovkový režim, tlačítka zoomu a mobilní gesto přiblížení dvěma prsty při šířce 390 px bez vodorovného přetékání stránky.
- Výchozí grafy obou období byly vizuálně prohlédnuty. Během testů nebyly zaznamenány chyby JavaScriptu.
- Odkazy na všechna čtyři období v hlavním menu směřují na existující HTML soubory.

Kontroly potvrzují správné zpracování dodaného zdroje a funkčnost místních HTML v testovaném prohlížeči. Historická správnost jednotlivých zdrojových údajů nebyla ověřována v externích pramenech. Plynulost gest na fyzickém telefonu nebyla měřena.

Bylo odstraněno 11 opakovaných hran v každém období. Jde o 18 různých zdrojových kopií, protože část záznamů z roku 1961 patří do obou období. Všechny odstraněné kopie jsou úplně shodné s ponechaným zdrojovým řádkem.
