const sharp = require('sharp');
const sizes = [48, 72, 96, 128, 192, 256, 512];

sizes.forEach(size => {
  sharp('icons/icon.png')
    .resize(size, size)
    .webp()
    .toFile(`icons/icon-${size}.webp`, (err) => {
      if (err) console.error(`❌ Error ${size}:`, err);
      else console.log(`✅ icon-${size}.webp generado`);
    });
});
