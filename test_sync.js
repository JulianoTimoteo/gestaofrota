const http = require('http');

function post(path, data, token) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data);
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const r = http.request({ hostname: '127.0.0.1', port: 3000, path, method: 'POST', headers }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve({ status: res.statusCode, data: d }));
        });
        r.on('error', reject);
        r.write(body);
        r.end();
    });
}

async function main() {
    const login = await post('/api/auth/login', { usuario: 'julianotimoteo', senha: 'tmotvini1986@#' });
    const j = JSON.parse(login.data);
    const token = j.token;
    
    const start = Date.now();
    const sync = await post('/api/auto-sync', {}, token);
    const elapsed = Date.now() - start;
    
    const d = JSON.parse(sync.data);
    console.log('Auto-sync status:', sync.status);
    console.log('Success:', d.success);
    console.log('Elapsed:', elapsed + 'ms');
    console.log('Equipamentos:', d.data?.counts?.equipamentos);
    console.log('Operações:', d.data?.counts?.operacoes);
    console.log('OS:', d.data?.counts?.ordensServico);
    console.log('Equipamentos com OS:', d.data?.equipamentos?.filter(e => e.statusOS === 'Com OS').length || 0);
}

main().catch(console.error);
