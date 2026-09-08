#!/usr/bin/env python3
"""Audit database integrity."""
import sqlite3
from datetime import datetime

conn = sqlite3.connect('meus_banco.db')
conn.row_factory = sqlite3.Row

print('=== AUDITORIA DE INTEGRIDADE ===')
print()

# Check sincronizacao_log
print('--- sincronizacao_log (ultimos 5) ---')
cursor = conn.execute('SELECT * FROM sincronizacao_log ORDER BY id DESC LIMIT 5')
for row in cursor.fetchall():
    print(f'  id={row["id"]} | {row["painel_nome"]} | status={row["status"]} | regs={row["registros_extraidos"]} | {row["data_sincronizacao"]}')

# Check ordens_servico dates
print()
print('--- ordens_servico (distinct dates) ---')
cursor = conn.execute('SELECT DISTINCT data_sincronizacao FROM ordens_servico ORDER BY data_sincronizacao DESC')
for row in cursor.fetchall():
    print(f'  {row[0]}')

# Check equipamentos dates
print()
print('--- equipamentos (distinct dates) ---')
cursor = conn.execute('SELECT DISTINCT data_sincronizacao FROM equipamentos')
for row in cursor.fetchall():
    print(f'  {row[0]}')

# Check operacoes dates
print()
print('--- operacoes (distinct dates) ---')
cursor = conn.execute('SELECT DISTINCT data_sincronizacao FROM operacoes')
for row in cursor.fetchall():
    print(f'  {row[0]}')

# Check painel_metricas dates
print()
print('--- painel_metricas (distinct dates) ---')
cursor = conn.execute('SELECT DISTINCT data_extracao FROM painel_metricas ORDER BY data_extracao DESC LIMIT 5')
for row in cursor.fetchall():
    print(f'  {row[0]}')

# Check all tables
print()
print('--- Tabelas e registros ---')
cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
tables = [row[0] for row in cursor.fetchall()]
for t in tables:
    count = conn.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0]
    print(f'  {t}: {count} registros')

conn.close()
