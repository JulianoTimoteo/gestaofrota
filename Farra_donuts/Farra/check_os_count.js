const http = require('http');

function get(path) {
    return new Promise((resolve, reject) => {
        const r = http.request({ hostname: '172.16.12.36', port: 8000, path, method: 'GET' }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve({ status: res.statusCode, data: d }));
        });
        r.on('error', reject);
        r.end();
    });
}

async function main() {
    const eqRes = await get('/api/equipamentos');
    const eqj = JSON.parse(eqRes.data);
    const comOS = eqj.data.filter(e => e.statusOS === 'Com OS');
    console.log('Equipamentos com OS:', comOS.length);
    comOS.forEach(e => {
        console.log('  codigo:', e.codigo, '| statusOS:', e.statusOS, '| desc:', e.descricao?.substring(0, 40));
    });

    const okEq = eqj.data.filter(e => e.statusOS === 'OK');
    console.log('\nEquipamentos OK:', okEq.length);
}

main().catch(console.error);
