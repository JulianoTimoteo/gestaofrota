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
    const eq70121 = eqj.data.find(e => e.codigo === '70121');
    console.log('Equip 70121:', JSON.stringify(eq70121, null, 2));

    const osRes = await get('/api/os');
    const osj = JSON.parse(osRes.data);
    const os70121 = osj.data.filter(os => os.codigoEquip && os.codigoEquip.includes('70121'));
    console.log('\nOS for 70121:', os70121.length);
    os70121.forEach(os => {
        console.log('  codigoEquip:', os.codigoEquip, '| statusOS:', os.statusOS);
    });
}

main().catch(console.error);
