const http = require('http');

function post(path, body, token) {
    return new Promise((resolve, reject) => {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const bodyStr = JSON.stringify(body);
        const r = http.request({ hostname: '127.0.0.1', port: 3000, path, method: 'POST', headers }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve({ status: res.statusCode, data: d }));
        });
        r.on('error', reject);
        r.write(bodyStr);
        r.end();
    });
}

function get(path, token) {
    return new Promise((resolve, reject) => {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const r = http.request({ hostname: '127.0.0.1', port: 3000, path, method: 'GET', headers }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve({ status: res.statusCode, data: d }));
        });
        r.on('error', reject);
        r.end();
    });
}

async function main() {
    const login = await post('/api/auth/login', { usuario: 'julianotimoteo', senha: 'tmotvini1986@#' });
    const loginData = JSON.parse(login.data);
    const token = loginData.token;
    console.log('Login success:', loginData.success);

    const dados = await get('/api/dados', token);
    const j = JSON.parse(dados.data);
    console.log('Dados success:', j.success);
    console.log('Equip count:', j.data?.equipamentos?.length);
    console.log('OS count:', j.data?.ordensServico?.length);
    console.log('Oper count:', j.data?.operacoes?.length);
    
    if (j.data?.equipamentos?.length > 0) {
        const grupos = {};
        j.data.equipamentos.forEach(eq => {
            const g = eq.grupo || 'N/A';
            grupos[g] = (grupos[g] || 0) + 1;
        });
        console.log('By group:', grupos);
    }

    const osRes = await get('/api/os', token);
    const osj = JSON.parse(osRes.data);
    const comOS = osj.data?.filter(os => os.statusOS === 'ABERTA').length || 0;
    console.log('OS abertas:', comOS);
    console.log('Total OS:', osj.data?.length || 0);
}

main().catch(console.error);
