import { readdir, writeFile } from 'fs';
import path from 'path';

const avatarsDir = './public/avatars';
const outputFile = './avatars.rs';

// first letter should be uppercase
const snakeToCamel = str =>
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase().replace(/([-_][a-z])/g, group =>
    group
      .toUpperCase()
      .replace('-', '')
      .replace('_', '')
  );


readdir(avatarsDir, (err, files) => {
  if (err) {
    console.error('Error reading directory:', err);
    return;
  }

  const enumName = 'Avatar';
  const enumValues = files.map((file) => snakeToCamel(path.parse(file).name));

  const enumDefinition = `enum ${enumName} {\n  ${enumValues.join(',\n  ')}\n}`;

  writeFile(outputFile, enumDefinition, (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return;
    }
    console.log('Avatars enum saved to', outputFile);
  });
});
