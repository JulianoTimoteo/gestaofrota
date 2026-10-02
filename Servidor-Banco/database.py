import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "simplefarm.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Tabela principal de Ordens de Serviço (OS)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ordens_servico (
        cod_os TEXT PRIMARY KEY,
        tipo_os TEXT,
        subclasse TEXT,
        frota_cc TEXT,
        status_os TEXT,
        tipo_oficina TEXT,
        oficina TEXT,
        data_comunicacao TEXT,
        data_entrada TEXT,
        data_previsao TEXT,
        dias_permanencia REAL,
        descricao_servico TEXT,
        ativo INTEGER DEFAULT 1,
        criado_em TEXT,
        atualizado_em TEXT
    )
    """)
    
    # Índices para acelerar consultas e dashboards
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_os_status ON ordens_servico(status_os);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_os_oficina ON ordens_servico(tipo_oficina);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_os_frota ON ordens_servico(frota_cc);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_os_ativo ON ordens_servico(ativo);")
    
    # Tabela de Histórico de Sincronizações
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS historico_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data_hora TEXT NOT NULL,
        total_os INTEGER DEFAULT 0,
        novas_os INTEGER DEFAULT 0,
        duracao_segundos REAL DEFAULT 0,
        status TEXT NOT NULL,
        mensagem TEXT
    )
    """)
    
    conn.commit()
    conn.close()

def salvar_ordens_servico(lista_os, duracao=0):
    """
    Insere ou atualiza ordens de serviço.
    Marca como inativas as que não vieram mais na demanda atual de OS abertas.
    """
    if not lista_os:
        registrar_historico(0, 0, duracao, "ALERTA", "Nenhuma OS coletada no ciclo atual.")
        return 0, 0

    conn = get_connection()
    cursor = conn.cursor()
    agora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Coleta os cod_os existentes antes do update
    cursor.execute("SELECT cod_os FROM ordens_servico WHERE ativo = 1")
    os_existentes = {row['cod_os'] for row in cursor.fetchall()}
    
    novas = 0
    cods_atuais = set()

    for item in lista_os:
        cod = str(item.get('cod_os', '')).strip()
        if not cod:
            continue
        
        cods_atuais.add(cod)
        if cod not in os_existentes:
            novas += 1

        dias = item.get('dias_permanencia', 0)
        try:
            dias_val = float(str(dias).replace(',', '.').strip())
        except Exception:
            dias_val = 0.0

        cursor.execute("""
        INSERT INTO ordens_servico (
            cod_os, tipo_os, subclasse, frota_cc, status_os,
            tipo_oficina, oficina, data_comunicacao, data_entrada,
            data_previsao, dias_permanencia, descricao_servico,
            ativo, criado_em, atualizado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        ON CONFLICT(cod_os) DO UPDATE SET
            tipo_os=excluded.tipo_os,
            subclasse=excluded.subclasse,
            frota_cc=excluded.frota_cc,
            status_os=excluded.status_os,
            tipo_oficina=excluded.tipo_oficina,
            oficina=excluded.oficina,
            data_comunicacao=excluded.data_comunicacao,
            data_entrada=excluded.data_entrada,
            data_previsao=excluded.data_previsao,
            dias_permanencia=excluded.dias_permanencia,
            descricao_servico=excluded.descricao_servico,
            ativo=1,
            atualizado_em=excluded.atualizado_em
        """, (
            cod,
            item.get('tipo_os', 'NORMAL'),
            item.get('subclasse', ''),
            item.get('frota_cc', ''),
            item.get('status_os', 'ABERTA'),
            item.get('tipo_oficina', ''),
            item.get('oficina', ''),
            item.get('data_comunicacao', ''),
            item.get('data_entrada', ''),
            item.get('data_previsao', ''),
            dias_val,
            item.get('descricao_servico', ''),
            agora,
            agora
        ))

    # Marca como inativas as OS que deixaram de existir na demanda ativa
    if cods_atuais:
        placeholders = ','.join('?' for _ in cods_atuais)
        cursor.execute(f"UPDATE ordens_servico SET ativo = 0, atualizado_em = ? WHERE ativo = 1 AND cod_os NOT IN ({placeholders})", [agora] + list(cods_atuais))

    conn.commit()
    conn.close()

    registrar_historico(len(cods_atuais), novas, duracao, "SUCESSO", f"Sincronizacao bem sucedida: {len(cods_atuais)} OS ativas ({novas} novas).")
    return len(cods_atuais), novas

def registrar_historico(total, novas, duracao, status, mensagem):
    conn = get_connection()
    cursor = conn.cursor()
    agora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
    INSERT INTO historico_sync (data_hora, total_os, novas_os, duracao_segundos, status, mensagem)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (agora, total, novas, round(duracao, 2), status, mensagem))
    conn.commit()
    conn.close()

def obter_metricas():
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) as total FROM ordens_servico WHERE ativo = 1")
    total_ativas = cursor.fetchone()['total']

    cursor.execute("SELECT COUNT(*) as campo FROM ordens_servico WHERE ativo = 1 AND tipo_oficina LIKE '%CAMPO%'")
    total_campo = cursor.fetchone()['campo']

    cursor.execute("SELECT COUNT(*) as externa FROM ordens_servico WHERE ativo = 1 AND tipo_oficina LIKE '%EXTERNA%'")
    total_externa = cursor.fetchone()['externa']

    cursor.execute("SELECT MAX(dias_permanencia) as max_dias FROM ordens_servico WHERE ativo = 1")
    max_dias = cursor.fetchone()['max_dias'] or 0.0

    cursor.execute("SELECT * FROM historico_sync ORDER BY id DESC LIMIT 1")
    ultimo_sync_row = cursor.fetchone()
    ultimo_sync = dict(ultimo_sync_row) if ultimo_sync_row else None

    conn.close()
    return {
        'total_ativas': total_ativas,
        'total_campo': total_campo,
        'total_externa': total_externa,
        'max_dias': round(max_dias, 1),
        'ultimo_sync': ultimo_sync
    }

def listar_ordens_servico(busca=None, tipo_oficina=None):
    conn = get_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM ordens_servico WHERE ativo = 1"
    params = []

    if tipo_oficina and tipo_oficina != 'TODOS':
        query += " AND tipo_oficina = ?"
        params.append(tipo_oficina)

    if busca:
        busca_wildcard = f"%{busca}%"
        query += """ AND (
            cod_os LIKE ? OR
            frota_cc LIKE ? OR
            subclasse LIKE ? OR
            oficina LIKE ? OR
            descricao_servico LIKE ?
        )"""
        params.extend([busca_wildcard] * 5)

    query += " ORDER BY dias_permanencia DESC"
    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def listar_historico_sync(limite=20):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM historico_sync ORDER BY id DESC LIMIT ?", (limite,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

if __name__ == '__main__':
    init_db()
    print("[*] Banco de dados simplefarm.db inicializado com sucesso.")
