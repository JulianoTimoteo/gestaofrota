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
    const osRes = await get('/api/os?limit=3');
    console.log('OS status:', osRes.status);
    const osj = JSON.parse(osRes.data);
    console.log('OS success:', osj.success);
    console.log('OS count:', osj.data?.length);
    if (osj.data?.length > 0) {
        console.log('First OS keys:', Object.keys(osj.data[0]));
        console.log('First OS:', JSON.stringify(osj.data[0]).substring(0, 800));
    }

    const eqRes = await get('/api/equipamentos');
    const eqj = JSON.parse(eqRes.data);
    console.log('\nEquip success:', eqj.success);
    console.log('Equip count:', eqj.data?.length);
    if (eqj.data?.length > 0) {
        console.log('First equip keys:', Object.keys(eqj.data[0]));
        console.log('First equip:', JSON.stringify(eqj.data[0]).substring(0, 800));
    }

    const stRes = await get('/api/status');
    const stj = JSON.parse(stRes.data);
    console.log('\nStatus:', JSON.stringify(stj.data, null, 2));
}

main().catch(console.error);
