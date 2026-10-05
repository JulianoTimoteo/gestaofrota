import os
import json
import time
import urllib.request
import urllib.error
from datetime import datetime

# Configurações do Firebase - Projeto OSOFICINA
FIREBASE_CONFIG = {
    "apiKey": "AIzaSyA-om0wkQ3HgUTY6wElZ9ld8LqAcw-rtuk",
    "authDomain": "osoficina.firebaseapp.com",
    "projectId": "osoficina",
    "storageBucket": "osoficina.firebasestorage.app",
    "messagingSenderId": "56966843172",
    "appId": "1:56966843172:web:c4e12b3f49cbff050801b1",
    "measurementId": "G-FJ59QJBD4C"
}

PROJECT_ID = FIREBASE_CONFIG["projectId"]
API_KEY = FIREBASE_CONFIG["apiKey"]

ADMIN_SDK_INITIALIZED = False
_db_admin = None

def inicializar_firebase_admin():
    """Inicializa o Firebase Admin SDK com credenciais locais (Service Account)."""
    global ADMIN_SDK_INITIALIZED, _db_admin
    if ADMIN_SDK_INITIALIZED and _db_admin:
        return _db_admin

    pasta = os.path.dirname(os.path.abspath(__file__))
    key_candidates = [
        os.path.join(pasta, "osoficina-firebase-adminsdk-fbsvc-e1d1ef7a32.json"),
        os.path.join(os.path.dirname(pasta), "VersaoDesktop", "osoficina-firebase-adminsdk-fbsvc-e1d1ef7a32.json"),
        os.path.join(pasta, "firebase_key.json"),
        os.path.join(pasta, "osoficina-key.json")
    ]
    for f in os.listdir(pasta):
        if "adminsdk" in f.lower() and f.endswith(".json"):
            key_candidates.insert(0, os.path.join(pasta, f))

    key_path = next((p for p in key_candidates if os.path.exists(p)), None)

    if key_path:
        try:
            import firebase_admin
            from firebase_admin import credentials, firestore
            if not firebase_admin._apps:
                cred = credentials.Certificate(key_path)
                firebase_admin.initialize_app(cred, {'projectId': PROJECT_ID})
            _db_admin = firestore.client()
            ADMIN_SDK_INITIALIZED = True
            print(f"[Firebase] Firebase Admin SDK inicializado com sucesso via {os.path.basename(key_path)}!", flush=True)
            return _db_admin
        except Exception as e:
            print(f"[Firebase] Falha ao iniciar Firebase Admin SDK: {e}", flush=True)
            return None
    return None

def salvar_estado_consolidado_firestore(payload_completo):
    """
    Grava o estado consolidado da frota no documento `estado_frota/atual` no Firestore.
    Usa apenas 1 operação de escrita, sendo 100% gratuito e ideal para leitura instantânea por apps Web/Mobile.
    """
    admin_db = inicializar_firebase_admin()
    if not admin_db:
        return False, "Firebase Admin SDK nao disponivel"

    try:
        agora_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        dados_data = payload_completo.get("data", {}) if isinstance(payload_completo, dict) else {}
        
        # Filtra e prepara payload limpo
        equipamentos = dados_data.get("equipamentos", [])
        ordens = dados_data.get("ordensServico", [])
        total_equip = len(equipamentos)
        total_os = len(ordens)
        com_os = sum(1 for e in equipamentos if e.get("statusOS") == "Com OS")
        pct_disp = round(((total_equip - com_os) / total_equip) * 100) if total_equip > 0 else 0

        doc_data = {
            "ultima_sincronizacao": agora_str,
            "total_equipamentos": total_equip,
            "total_os": total_os,
            "equipamentos_com_os": com_os,
            "disponibilidade_geral_pct": pct_disp,
            "status_sistema": "online",
            "atualizado_em": agora_str,
            # Amostra das OS críticas (> 24h)
            "os_criticas_count": sum(1 for o in ordens if float(str(o.get('diasPermanencia') or 0).replace(',', '.')) >= 1.0)
        }

        admin_db.collection("estado_frota").document("atual").set(doc_data, merge=True)
        print(f"[Firebase Nuvem] Estado consolidado atualizado com sucesso em estado_frota/atual ({total_equip} equip, {total_os} OS)!", flush=True)
        return True, "Estado consolidado atualizado no Firestore"
    except Exception as e:
        print(f"[Firebase Nuvem] Erro ao gravar estado consolidado: {e}", flush=True)
        return False, str(e)

def salvar_no_firestore(lista_os, metricas=None):
    """
    Sincroniza as Ordens de Serviço e métricas para o Cloud Firestore em batches seguros de até 400 itens.
    """
    if not lista_os:
        return False, "Nenhuma OS fornecida"

    admin_db = inicializar_firebase_admin()
    if not admin_db:
        return False, "Firebase Admin SDK nao disponivel"

    try:
        agora_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        col_ref = admin_db.collection("ordens_servico")
        
        # O Firestore aceita no máximo 500 operações por batch commit.
        # Fatiamos em blocos de 400 para margem de segurança total.
        chunk_size = 400
        total_enviadas = 0

        for i in range(0, len(lista_os), chunk_size):
            chunk = lista_os[i:i + chunk_size]
            batch = admin_db.batch()
            for item in chunk:
                cod = str(item.get("cod_os", item.get("codOS", ""))).strip()
                if not cod:
                    continue
                doc_id = cod.replace("/", "_").replace(".", "_")
                doc_ref = col_ref.document(doc_id)
                dados_doc = dict(item)
                dados_doc["atualizado_em_nuvem"] = agora_str
                batch.set(doc_ref, dados_doc, merge=True)
            batch.commit()
            total_enviadas += len(chunk)

        # Grava metadados de status
        admin_db.collection("metadados").document("status").set({
            **(metricas or {}),
            "ultima_sincronizacao": agora_str,
            "total_os": total_enviadas,
            "status": "online"
        }, merge=True)

        print(f"[Firebase Nuvem] {total_enviadas} OS sincronizadas no Cloud Firestore em lotes seguros!", flush=True)
        return True, f"{total_enviadas} OS sincronizadas via Admin SDK"
    except Exception as e:
        print(f"[Firebase Nuvem] Erro ao sincronizar OS no Firestore: {e}", flush=True)
        return False, str(e)

def sincronizar_banco_local_com_firebase(conn):
    """
    Função utilitária que lê os dados do SQLite local e dispara o envio completo para o Firebase.
    """
    try:
        cur_os = conn.execute("""
            SELECT cod_os, tipo_os, subclasse, frota_cc, status_os, tipo_oficina, oficina,
                   data_comunicacao, data_entrada, data_previsao, dias_permanencia, descricao_servico, atualizado_em
            FROM ordens_servico
            WHERE upper(status_os) != 'FECHADA' AND ativo = 1
        """)
        lista_os = [dict(r) for r in cur_os.fetchall()]
        
        cur_cnt = conn.execute("SELECT COUNT(*) FROM equipamentos").fetchone()
        tot_eq = cur_cnt[0] if cur_cnt else 0

        metricas = {
            "total_equipamentos": tot_eq,
            "total_os_abertas": len(lista_os)
        }

        # 1. Salva metadados e resumo consolidado
        sucesso_resumo, _ = salvar_estado_consolidado_firestore({"data": {"equipamentos": [{"statusOS": "Com OS"}] * len(lista_os), "ordensServico": lista_os}})
        
        # 2. Salva ordens de serviço em chunks
        sucesso_os, msg_os = salvar_no_firestore(lista_os, metricas)
        return sucesso_os or sucesso_resumo, msg_os
    except Exception as err:
        print(f"[Firebase Nuvem] Falha na sincronizacao do banco local: {err}", flush=True)
        return False, str(err)
