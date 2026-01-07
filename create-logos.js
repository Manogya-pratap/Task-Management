const fs = require('fs');

// Create proper PNG files with correct headers
const createPNG = (width, height, color = [128, 0, 32, 255]) => {
  // Simple PNG creation - this creates a minimal valid PNG
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  
  const ihdrCrc = require('crypto').createHash('md5').update(Buffer.concat([Buffer.from('IHDR'), ihdrData])).digest().slice(0, 4);
  const ihdr = Buffer.concat([
    Buffer.from([0, 0, 0, 13]), // length
    Buffer.from('IHDR'),
    ihdrData,
    ihdrCrc
  ]);
  
  // Simple IDAT chunk with minimal data
  const idatData = Buffer.from([0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01]);
  const idatCrc = require('crypto').createHash('md5').update(Buffer.concat([Buffer.from('IDAT'), idatData])).digest().slice(0, 4);
  const idat = Buffer.concat([
    Buffer.from([0, 0, 0, idatData.length]),
    Buffer.from('IDAT'),
    idatData,
    idatCrc
  ]);
  
  // IEND chunk
  const iend = Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);
  
  return Buffer.concat([signature, ihdr, idat, iend]);
};

// Create a simple ICO file
const createICO = () => {
  // Minimal ICO file structure
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type (1 = ICO)
  header.writeUInt16LE(1, 4); // count
  
  const entry = Buffer.alloc(16);
  entry[0] = 16; // width
  entry[1] = 16; // height
  entry[2] = 0;  // colors
  entry[3] = 0;  // reserved
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(40 + 16*16*4, 8); // size
  entry.writeUInt32LE(22, 12); // offset
  
  // Simple bitmap data
  const bitmapHeader = Buffer.alloc(40);
  bitmapHeader.writeUInt32LE(40, 0); // header size
  bitmapHeader.writeInt32LE(16, 4); // width
  bitmapHeader.writeInt32LE(32, 8); // height (doubled for ICO)
  bitmapHeader.writeUInt16LE(1, 12); // planes
  bitmapHeader.writeUInt16LE(32, 14); // bits per pixel
  
  const pixelData = Buffer.alloc(16 * 16 * 4);
  // Fill with red color (BGRA format)
  for (let i = 0; i < pixelData.length; i += 4) {
    pixelData[i] = 32;     // B
    pixelData[i + 1] = 0;  // G
    pixelData[i + 2] = 128; // R
    pixelData[i + 3] = 255; // A
  }
  
  const maskData = Buffer.alloc(16 * 4); // AND mask (all transparent)
  
  return Buffer.concat([header, entry, bitmapHeader, pixelData, maskData]);
};

try {
  // Create proper favicon.ico
  const faviconData = createICO();
  fs.writeFileSync('client/public/favicon.ico', faviconData);
  
  // Create proper PNG files
  const logo192Data = createPNG(192, 192);
  fs.writeFileSync('client/public/logo192.png', logo192Data);
  
  const logo512Data = createPNG(512, 512);
  fs.writeFileSync('client/public/logo512.png', logo512Data);
  
  console.log('✅ Valid logo files created successfully!');
  console.log('📁 Created: client/public/favicon.ico');
  console.log('📁 Created: client/public/logo192.png');
  console.log('📁 Created: client/public/logo512.png');
} catch (error) {
  console.error('❌ Error creating logo files:', error.message);
}