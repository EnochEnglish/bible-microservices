const { extractDocText } = require('./ole2-extractor');
const files = [
    {f:'bog-ch.doc', d:'badgood'},
    {f:'onetoone-ch.doc', d:'onetoone'},
    {f:'apolo-ch.doc', d:'apolo'},
    {f:'yuwen-ch.doc', d:'resource'}
];
for (const {f, d} of files) {
    const path = `D:\\dev\\usebible.com\\html\\blessed\\chinese\\download\\${d}\\${f}`;
    const text = extractDocText(path);
    const cn = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    console.log(`${f}: len=${text.length} cn=${cn}`);
    console.log('  first200:', text.substring(0, 200));
    console.log();
}
