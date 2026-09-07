#!/usr/bin/env python3
"""
SimpleFarm Integration — Teste de Carga, Exaustão e Precisão
Mede a capacidade de usuários concorrentes antes do colapso do banco de dados/API.
"""

import sys
import io
import time
import requests
import urllib3
import concurrent.futures
from statistics import mean, median

# Forçar stdout UTF-8 no Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

urllib3.disable_warnings()

BASE_URL = 'http://127.0.0.1:8000'

def single_user_session(user_id):
    """Simula o ciclo de vida completo de uma requisição de um usuário:
    1. Check de Saúde/Sistema (/api/system)
    2. Consulta de Status (/api/status)
    3. Consulta de Equipamentos (/api/equipamentos)
    4. Consulta da Saúde da Sincronização (/api/sync/health)
    """
    t0 = time.time()
    
    try:
        session = requests.Session()
        session.verify = False
        
        # 1. System Info
        r1 = session.get(f'{BASE_URL}/api/system', timeout=5)
        if r1.status_code != 200:
            return (False, (time.time() - t0) * 1000, f'HTTP {r1.status_code} em /api/system')
        
        # 2. Status
        r2 = session.get(f'{BASE_URL}/api/status', timeout=5)
        if r2.status_code != 200:
            return (False, (time.time() - t0) * 1000, f'HTTP {r2.status_code} em /api/status')
        
        # 3. Equipamentos
        r3 = session.get(f'{BASE_URL}/api/equipamentos', timeout=5)
        if r3.status_code != 200:
            return (False, (time.time() - t0) * 1000, f'HTTP {r3.status_code} em /api/equipamentos')
            
        # 4. Sync Health
        r4 = session.get(f'{BASE_URL}/api/sync/health', timeout=5)
        if r4.status_code != 200:
            return (False, (time.time() - t0) * 1000, f'HTTP {r4.status_code} em /api/sync/health')
            
        latency = (time.time() - t0) * 1000
        return (True, latency, None)
    except Exception as e:
        latency = (time.time() - t0) * 1000
        return (False, latency, str(e))

def run_load_tier(num_concurrent_users):
    print(f"\n========================================================")
    print(f"[TESTE DE CARGA] {num_concurrent_users} USUARIOS SIMULTANEOS")
    print(f"========================================================")
    
    t_start = time.time()
    results = []
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_concurrent_users) as executor:
        futures = [executor.submit(single_user_session, i) for i in range(num_concurrent_users)]
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())
            
    t_total = time.time() - t_start
    
    successes = [r for r in results if r[0]]
    failures  = [r for r in results if not r[0]]
    latencies = [r[1] for r in results]
    
    success_rate = (len(successes) / len(results)) * 100 if results else 0
    rps = (len(results) * 4) / t_total if t_total > 0 else 0
    avg_latency = mean(latencies) if latencies else 0
    med_latency = median(latencies) if latencies else 0
    max_latency = max(latencies) if latencies else 0
    
    print(f"  * Total de Requisicoes:    {len(results) * 4} (4 endpoints por usuario)")
    print(f"  * Usuarios Atendidos:      {len(successes)} / {len(results)} ({success_rate:.1f}%)")
    print(f"  * Falhas / Erros:          {len(failures)}")
    print(f"  * Tempo Total de Teste:    {t_total:.2f} s")
    print(f"  * Vazaio (RPS):             {rps:.1f} req/seg")
    print(f"  * Latencia Media:          {avg_latency:.1f} ms")
    print(f"  * Latencia Mediana (P50):  {med_latency:.1f} ms")
    print(f"  * Latencia Maxima:         {max_latency:.1f} ms")
    
    if failures:
        err_samples = list(set([f[2] for f in failures]))[:3]
        print(f"  [AVISO] Amostra de Erros: {err_samples}")
        
    collapsed = success_rate < 95.0 or avg_latency > 4000.0
    return {
        'users': num_concurrent_users,
        'success_rate': success_rate,
        'rps': rps,
        'avg_latency': avg_latency,
        'max_latency': max_latency,
        'collapsed': collapsed
    }

def main():
    print("========================================================")
    print("  SIMPLEFARM INTEGRATION - TESTE DE ESTRESSE E EXAUSTAO")
    print("  Objetivo: Encontrar o Ponto de Colapso do Banco SQLite WAL")
    print("========================================================")
    
    tiers = [10, 25, 50, 100, 150, 200, 300, 500]
    tier_results = []
    collapse_point = None
    
    for t in tiers:
        res = run_load_tier(t)
        tier_results.append(res)
        if res['collapsed'] and not collapse_point:
            collapse_point = res
            print(f"\n[ALERTA] PONTO DE DEGRADACAO/COLAPSO DETECTADO COM {t} USUARIOS SIMULTANEOS!")
        time.sleep(0.5)
        
    print("\n========================================================")
    print(" RESUMO FINAL DE RESISTENCIA DO SISTEMA")
    print("========================================================")
    print(" Usuarios  |  Taxa Sucesso  |  Req/seg (RPS) | Latencia Media | Status")
    print("----------------------------------------------------------------------")
    for r in tier_results:
        status_str = "COLAPSO / LIMITE" if r['collapsed'] else "ESTAVEL"
        print(f" {r['users']:<9} | {r['success_rate']:>6.1f}%       | {r['rps']:>11.1f}   | {r['avg_latency']:>9.1f} ms   | {status_str}")
    print("----------------------------------------------------------------------")
    
    if collapse_point:
        print(f"\n- O sistema/banco opera com estabilidade ideal ate ~{collapse_point['users']} acessos simultaneos.")
    else:
        print(f"\n- O sistema suportou todas as camadas de carga com estabilidade excelente!")

if __name__ == '__main__':
    main()
