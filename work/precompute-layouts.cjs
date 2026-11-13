const fs = require('node:fs');
const vm = require('node:vm');
const pattern = /(<script id="data" type="application\/json">)([\s\S]*?)(<\/script>)/;
for (const filename of fs.readdirSync('.').filter(name => /^Kreativní spolupráce .*\.html$/.test(name))) {
  let html = fs.readFileSync(filename, 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  new vm.Script(script);
  const functions = script.slice(script.indexOf('function layoutForceAtlas2('), script.indexOf('function buildNetwork('));
  const api = new Function(functions + '\nreturn {arrangeComponents,initialLayoutSignature};')();
  const networks = JSON.parse(html.match(pattern)[2]);
  for (const network of networks) {
    const signature = api.initialLayoutSignature(network);
    if (network.initialLayout?.signature === signature
      && network.initialLayout.coordinates.length === network.nodes.length) {
      console.log(network.folder, 'already prepared');
      continue;
    }
    const started = Date.now();
    const nodes = network.nodes.map((row, index) => {
      const angle = index * 2.399963;
      return { Id: row.Id, Type: row.Type, x: Math.sqrt(index + 1) * 36 * Math.cos(angle),
        y: Math.sqrt(index + 1) * 36 * Math.sin(angle), links: [], degree: 0 };
    });
    const ids = new Map(nodes.map(node => [node.Id, node]));
    const edges = network.edges.map(row => ({ ...row, a: ids.get(row.Source), b: ids.get(row.Target) }));
    for (const edge of edges) {
      edge.a.links.push([edge.b, edge]);
      edge.b.links.push([edge.a, edge]);
      edge.b.degree++;
      if (!network.directed) edge.a.degree++;
    }
    const maximum = Math.max(1, ...nodes.map(node => node.degree));
    const radiusScale = !network.directed && network.folder.startsWith('Production') ? .7 : 1;
    nodes.forEach(node => node.r = radiusScale * (4 + 20 * node.degree / maximum));
    const spacious = network.folder.startsWith('Collab');
    api.arrangeComponents(nodes, edges, spacious, 1.8);
    const coordinates = nodes.map(node => [Number(node.x.toFixed(5)), Number(node.y.toFixed(5))]);
    if (!coordinates.every(point => point.every(Number.isFinite))) throw Error('Invalid positions');
    network.initialLayout = { signature, coordinates };
    console.log(network.folder, Date.now() - started, 'ms');
  }
  html = html.replace(pattern, (_, open, data, close) => open + JSON.stringify(networks).replace(/</g, '\\u003c') + close);
  fs.writeFileSync(filename, html, 'utf8');
}
