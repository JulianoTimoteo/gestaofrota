#!/usr/bin/env python3
"""Verify database status."""
import sqlite3

conn = sqlite3.connect('meus_banco.db')
conn.row_factory = sqlite3.Row

print('=== STATUS DO BANCO DE DADOS ===')
print()

# Metricas
cursor = conn.execute('SELECT COUNT(*) FROM painel_metricas')
print(f'painel_metricas: {cursor.fetchone()[0]} registros')

# OS
cursor = conn.execute('SELECT COUNT(*) FROM ordens_servico')
print(f'ordens_servico: {cursor.fetchone()[0]} registros')

# Equipamentos
cursor = conn.execute('SELECT COUNT(*) FROM equipamentos')
print(f'equipamentos: {cursor.fetchone()[0]} registros')

# Operacoes
cursor = conn.execute('SELECT COUNT(*) FROM operacoes')
print(f'operacoes: {cursor.fetchone()[0]} registros')

# Ultima sincronizacao
cursor = conn.execute('SELECT * FROM sincronizacao_log ORDER BY id DESC LIMIT 1')
row = cursor.fetchone()
if row:
    print(f'\nUltima sincronizacao: {row["data_sincronizacao"]}')
    print(f'Status: {row["status"]}')
    print(f'Registros: {row["registros_extraidos"]}')

# Metricas recentes
print('\n=== METRICAS ATUALIZADAS ===')
cursor = conn.execute('SELECT painel_nome, widget_titulo, valor, unidade FROM painel_metricas ORDER BY id DESC LIMIT 10')
for row in cursor.fetchall():
    print(f'  {row["painel_nome"]} - {row["widget_titulo"]}: {row["valor"]} {row["unidade"]}')

conn.close()
