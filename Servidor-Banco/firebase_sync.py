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

# Tenta carregar firebase-admin se houver credencial de service account
ADMIN_SDK_INITIALIZED = False
_db_admin = None

def inicializar_firebase_admin():
    global ADMIN_SDK_INITIALIZED, _db_admin
    if ADMIN_SDK_INITIALIZED:
        return _db_admin

    # Procura chave JSON na pasta local
    pasta = os.path.dirname(__file__)
    key_candidates = [
        os.path.join(pasta, "osoficina-firebase-adminsdk-fbsvc-e1d1ef7a32.json"),
        os.path.join(pasta, "firebase_key.json"),
        os.path.join(pasta, "osoficina-key.json")
    ]
    # Também procura qualquer arquivo *adminsdk*.json na pasta
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

def obter_auth_token():
    """Gera token de autenticacao anonima pelo Firebase Auth."""
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={API_KEY}"
    payload = json.dumps({"returnSecureToken": True}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("idToken")
    except Exception as e:
        print(f"[Firebase] Aviso ao autenticar no Auth: {e}", flush=True)
        return None

def formatar_valor_firestore(val):
    """Converte um valor Python para o formato aceito pela REST API do Cloud Firestore."""
    if val is None:
        return {"nullValue": None}
    elif isinstance(val, bool):
        return {"booleanValue": val}
    elif isinstance(val, (int, float)):
        return {"doubleValue": float(val)}
    else:
        return {"stringValue": str(val)}

def converter_para_firestore_fields(doc_dict):
    return {k: formatar_valor_firestore(v) for k, v in doc_dict.items()}

def salvar_no_firestore(lista_os, metricas=None):
    """
    Sincroniza todas as Ordens de Serviço e métricas para o Cloud Firestore (default).
    Utiliza Firebase Admin SDK se a chave existir, ou REST API como fallback.
    """
    if not lista_os:
        print("[Firebase] Nenhuma OS para sincronizar.", flush=True)
        return False, "Nenhuma OS fornecida"

    # Método 1: Firebase Admin SDK (Recomendado se houver service account)
    admin_db = inicializar_firebase_admin()
    if admin_db:
        try:
            batch = admin_db.batch()
            agora_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            col_ref = admin_db.collection("ordens_servico")

            for item in lista_os:
                cod = str(item.get("cod_os", "")).strip()
                if not cod:
                    continue
                # Normaliza ID para Firestore
                doc_id = cod.replace("/", "_").replace(".", "_")
                doc_ref = col_ref.document(doc_id)
                dados_doc = dict(item)
                dados_doc["atualizado_em_nuvem"] = agora_str
                batch.set(doc_ref, dados_doc, merge=True)

            batch.commit()

            # Grava metadados
            if metricas:
                admin_db.collection("metadados").document("status").set({
                    **metricas,
                    "ultima_sincronizacao": agora_str
                }, merge=True)

            print(f"[Firebase Admin] {len(lista_os)} Ordens de Servico sincronizadas no Firestore com sucesso!", flush=True)
            return True, f"{len(lista_os)} OS sincronizadas via Admin SDK"
        except Exception as e:
            print(f"[Firebase Admin] Erro no commit: {e}", flush=True)

    # Método 2: REST API direta com Firestore (Fallback / API Key)
    token = obter_auth_token()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    base_fs_url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"
    agora_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    sucessos = 0
    erros = 0
    ultimo_erro = ""

    for item in lista_os:
        cod = str(item.get("cod_os", "")).strip()
        if not cod:
            continue
        doc_id = cod.replace("/", "_").replace(".", "_")
        url_doc = f"{base_fs_url}/ordens_servico/{doc_id}?key={API_KEY}" if not token else f"{base_fs_url}/ordens_servico/{doc_id}"

        dados_doc = dict(item)
        dados_doc["atualizado_em_nuvem"] = agora_str
        payload = {"fields": converter_para_firestore_fields(dados_doc)}
        data_bytes = json.dumps(payload).encode("utf-8")

        req = urllib.request.Request(url_doc, data=data_bytes, headers=headers, method="PATCH")
        try:
            with urllib.request.urlopen(req, timeout=8) as resp:
                if resp.status in (200, 201):
                    sucessos += 1
        except urllib.error.HTTPError as he:
            erros += 1
            ultimo_erro = f"HTTP {he.code}: {he.read().decode('utf-8')[:120]}"
            if he.code == 403:
                # Regras bloqueando, interrompe para não sobrecarregar
                print(f"[Firebase REST] Erro de permissao (403): Verifique as regras do Firestore!", flush=True)
                return False, "Permissao negada (403): Atualize as regras do Firestore ou use a chave de servico."
        except Exception as ex:
            erros += 1
            ultimo_erro = str(ex)

    # Atualiza metadados
    if metricas and sucessos > 0:
        try:
            url_meta = f"{base_fs_url}/metadados/status?key={API_KEY}" if not token else f"{base_fs_url}/metadados/status"
            meta_dict = {**metricas, "ultima_sincronizacao": agora_str}
            req_meta = urllib.request.Request(url_meta, data=json.dumps({"fields": converter_para_firestore_fields(meta_dict)}).encode("utf-8"), headers=headers, method="PATCH")
            urllib.request.urlopen(req_meta, timeout=8)
        except Exception:
            pass

    if sucessos > 0:
        print(f"[Firebase REST] {sucessos} Ordens de Servico sincronizadas no Firestore!", flush=True)
        return True, f"{sucessos} OS sincronizadas via REST"
    else:
        print(f"[Firebase REST] Falha na sincronizacao: {ultimo_erro}", flush=True)
        return False, ultimo_erro

if __name__ == "__main__":
    import database
    dados = database.listar_ordens_servico()
    metricas = database.obter_metricas()
    print(f"[*] Testando sincronizacao de {len(dados)} OS com o Cloud Firestore...")
    sucesso, msg = salvar_no_firestore(dados, metricas)
    print(f"Resultado: {sucesso} — {msg}")
