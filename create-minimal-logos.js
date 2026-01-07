#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create minimal valid image files
function createMinimalLogos() {
  const publicDir = path.join(__dirname, 'client', 'public');
  
  // Minimal valid PNG header (1x1 transparent pixel)
  const minimalPNG = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // Width: 1
    0x00, 0x00, 0x00, 0x01, // Height: 1
    0x08, 0x06, 0x00, 0x00, 0x00, // Bit depth, color type, compression, filter, interlace
    0x1F, 0x15, 0xC4, 0x89, // CRC
    0x00, 0x00, 0x00, 0x0A, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // Compressed data
    0x0D, 0x0A, 0x2D, 0xB4, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  // Minimal valid ICO file (16x16 icon)
  const minimalICO = Buffer.from([
    0x00, 0x00, // Reserved
    0x01, 0x00, // Type: ICO
    0x01, 0x00, // Number of images
    0x10, 0x10, // Width, Height (16x16)
    0x00, 0x00, // Color count, Reserved
    0x01, 0x00, // Planes
    0x20, 0x00, // Bits per pixel
    0x68, 0x04, 0x00, 0x00, // Size of image data
    0x16, 0x00, 0x00, 0x00, // Offset to image data
    // BMP header and minimal image data (transparent 16x16)
    ...Array(1128).fill(0)
  ]);
  
  try {
    // Write favicon.ico
    fs.writeFileSync(path.join(publicDir, 'favicon.ico'), minimalICO);
    console.log('✅ Created favicon.ico');
    
    // Write logo192.png (just copy the minimal PNG)
    fs.writeFileSync(path.join(publicDir, 'logo192.png'), minimalPNG);
    console.log('✅ Created logo192.png');
    
    // Write logo512.png (just copy the minimal PNG)
    fs.writeFileSync(path.join(publicDir, 'logo512.png'), minimalPNG);
    console.log('✅ Created logo512.png');
    
    console.log('🎉 All minimal logo files created successfully!');
  } catch (error) {
    console.error('❌ Error creating logo files:', error);
  }
}

createMinimalLogos();