const fs = require('fs').promises;
const xmlbuilder = require('xmlbuilder');
const { createCanvas, loadImage } = require('canvas');

async function generate(definition, outPath) {
    const pixelSize = 1;

    const { name, characters } = definition;

    let mostRows = 0;
    let totalCols = 0;
    for (const matrix of Object.values(characters)) {
        mostRows = Math.max(mostRows, matrix.length);
        totalCols += matrix[0].length;
    }

    const doc = xmlbuilder.create('font');

    doc.ele('info')
        .att('face', name)
        .att('size', pixelSize * mostRows)
        .att('bold', 0)
        .att('italic', 0)
        .att('charset', '')
        .att('unicode', '')
        .att('stretchH', 100)
        .att('smooth', 1)
        .att('aa', 0)
        .att('padding', '0,0,0,0')
        .att('spacing', '0,0')
        .att('outline', 0);

    doc.ele('common')
        .att('lineHeight', mostRows * pixelSize)
        .att('base', mostRows * pixelSize)
        .att('scaleW', totalCols * pixelSize)
        .att('scaleH', mostRows * pixelSize)
        .att('pages', 1)
        .att('packed', 0);

    const pagesEl = doc.ele('pages');
    pagesEl.ele('page')
        .att('id', 0)
        .att('file', `${name}.png`);

    const charsEl = doc.ele('chars')
        .att('count', Object.keys(characters).length);

    const canvas = createCanvas(totalCols * pixelSize, mostRows * pixelSize);

    const ctx = canvas.getContext('2d');
    ctx.scale(pixelSize, pixelSize);

    ctx.fillStyle = '#fff';

    let startX = 0;
    for (const character of Object.keys(characters)) {
        ctx.save();
        ctx.translate(startX, 0);

        const matrix = characters[character];
        for (let row = 0 ; row < matrix.length ; row++) {
            for (let col = 0 ; col < matrix[row].length ; col++) {
                if (!matrix[row][col]) continue;

                ctx.fillRect(col, row, 1, 1);
            }
        }

        ctx.restore();

        const charEl = charsEl.ele('char')
            .att('id', character.charCodeAt(0))
            .att('x', startX * pixelSize)
            .att('y', 0)
            .att('width', matrix[0].length * pixelSize)
            .att('height', matrix.length * pixelSize)
            .att('xoffset', 0)
            .att('xadvance', (matrix[0].length + 1) * pixelSize)
            .att('yoffset', 0)
            .att('page', 0)
            .att('chnl', 15);

        startX += matrix[0].length;
    }

    await exportCanvas(canvas, `${outPath}/${name}.png`);
    await fs.writeFile(`${outPath}/${name}.fnt`, doc.toString({'pretty': true}));
}

async function exportCanvas(canvas, path) {
    const dataString = canvas.toDataURL();
    const base64 = dataString.split(',')[1];

    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);

        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    await fs.writeFile(path, byteArrays);
}

async function main() {
    const definitionPath = process.argv[2];
    if (!definitionPath) {
        throw new Error('Must specify definition');
    }

    const outPath = process.argv[3];
    if (!outPath) {
        throw new Error('Must specify output path');
    }

    const definitionContent = await fs.readFile(definitionPath);
    const definition = JSON.parse(definitionContent.toString());

    await generate(definition, outPath);
}

main();
