import { rollup } from 'rollup';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const build = async () => {
  // rebuild JS without modules
  const assetsDir = path.resolve(__dirname, '../cordova/www/assets');
  let entry = fs
    .readdirSync(assetsDir)
    .filter((f) => f.startsWith('index-') && f.endsWith('.js'))[0];
  if (!entry) {
    console.error('No index-*.js found in', assetsDir);
    process.exit(1);
  }
  const hash = entry.split('index-')[1].split('.js')[0];

  const bundle = await rollup({
    input: path.resolve(assetsDir, entry),
  });
  await bundle.write({
    file: path.resolve(assetsDir, `index-${hash}.js`),
    format: 'iife',
    name: 'MyApp',
    sourcemap: false,
  });

  // Remove old chunk files
  fs.readdirSync(assetsDir).forEach((f) => {
    if (f.endsWith('.js') && f.split('.').length > 2 && f !== `index-${hash}.js`) {
      fs.rmSync(path.resolve(assetsDir, f));
    }
  });

  // fix index.html
  const indexPath = path.resolve(__dirname, '../cordova/www/index.html');
  const indexContent = fs
    .readFileSync(indexPath, 'utf8')
    .split('\n')
    .map((line) => {
      if (line.includes('<link rel="modulepreload"')) return '';
      if (line.includes('<script type="module"')) return '';
      if (line.includes('</body>'))
        return `  <script src="assets/index-${hash}.js"></script>\n</body>`;
      return line;
    })
    .join('\n');
  fs.writeFileSync(indexPath, indexContent);
  console.log('Cordova post-build completed successfully.');
};

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
