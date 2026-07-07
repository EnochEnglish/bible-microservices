const { execSync } = require('child_process');
const fs = require('fs');

function downloadAndInstall(pkgName, version, url) {
    const outPath = `D:\\dev\\github\\bible-microservices\\${pkgName}.tgz`;
    const extractDir = `D:\\dev\\github\\bible-microservices\\${pkgName}-tmp`;
    const targetDir = `D:\\dev\\github\\bible-microservices\\node_modules\\${pkgName}`;
    
    const fullUrl = url || `https://registry.npmjs.org/${pkgName}/-/${pkgName}-${version}.tgz`;
    console.log(`Downloading ${pkgName}...`);
    execSync(`curl -sL "${fullUrl}" -o "${outPath}"`, { timeout: 30000 });
    console.log(`  Downloaded: ${fs.statSync(outPath).size} bytes`);
    
    if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true });
    fs.mkdirSync(extractDir, { recursive: true });
    
    execSync(`tar -xzf "${outPath}" -C "${extractDir}"`, { timeout: 10000 });
    
    const pkgDir = `${extractDir}\\package`;
    if (fs.existsSync(targetDir)) fs.rmSync(targetDir, { recursive: true });
    fs.mkdirSync(targetDir, { recursive: true });
    execSync(`xcopy /E /I /Y "${pkgDir}" "${targetDir}"`, { timeout: 10000 });
    
    fs.rmSync(extractDir, { recursive: true });
    fs.unlinkSync(outPath);
    console.log(`  Installed ${pkgName}`);
}

// Install safer-buffer first
downloadAndInstall('safer-buffer', '2.1.2');

// iconv-lite already installed, just verify
try {
    require('iconv-lite');
    console.log('iconv-lite verified!');
} catch(e) {
    // Re-install if needed
    downloadAndInstall('iconv-lite', '0.6.3');
    require('iconv-lite');
    console.log('iconv-lite verified!');
}

// Test GBK decoding
const iconv = require('iconv-lite');
const fs2 = require('fs');
const buf = fs2.readFileSync('D:\\dev\\usebible.com\\html\\blessed\\chinese\\download\\badgood\\badgood-ch.doc');
// Extract WordDocument stream text (sector 8, 9937 bytes)
// For now just test with the raw file
const text = iconv.decode(buf.slice(768, 4816), 'gbk');
const cn = (text.match(/[\u4e00-\u9fff]/g) || []).length;
console.log(`GBK test: ${text.length} chars, ${cn} Chinese`);
console.log('First 300:', text.substring(0, 300));
