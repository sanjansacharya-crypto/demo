const Jimp = require('jimp');

async function processImage(filename) {
    try {
        console.log("Processing", filename);
        const image = await Jimp.read(filename);
        const width = image.bitmap.width;
        const height = image.bitmap.height;

        // Sample the exact background color from the extreme top-left corner
        const cornerColor = image.getPixelColor(0, 0);
        const refR = (cornerColor >> 24) & 255;
        const refG = (cornerColor >> 16) & 255;
        const refB = (cornerColor >> 8) & 255;
        
        console.log(`Reference Background color for ${filename}: rgb(${refR}, ${refG}, ${refB})`);

        image.scan(0, 0, width, height, function(x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];

            // 1. Is it matching our reference green color? (Tolerance based)
            // 2. Is it universally "Green"?
            const isGreen = (g > r + 10 && g > b + 10);
            
            if (isGreen) {
                // Background -> transparent
                this.bitmap.data[idx + 3] = 0; 
            }
        });

        await image.writeAsync(filename);
        console.log("Successfully removed green background for", filename);
    } catch (e) {
        console.error("Failed on", filename, e);
    }
}

Promise.all([
    processImage('3d-puppy.png'), 
    processImage('3d-dog.png')
]);
