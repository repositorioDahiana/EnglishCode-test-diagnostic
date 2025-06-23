import requests
from jose import jwt
from django.conf import settings
import json

ALGORITHMS = ["RS256"]

def get_token_auth_header(request):
    auth = request.headers.get("Authorization", None)
    if not auth:
        raise Exception("Authorization header missing")

    parts = auth.split()

    if parts[0].lower() != "bearer":
        raise Exception("Authorization header must start with Bearer")
    elif len(parts) == 1:
        raise Exception("Token not found")
    elif len(parts) > 2:
        raise Exception("Authorization header must be Bearer token")

    return parts[1]

def get_management_api_token():
    """
    Obtiene un token de acceso para la Management API de Auth0
    """
    try:
        url = f"https://{settings.AUTH0_DOMAIN}/oauth/token"
        payload = {
            "client_id": settings.AUTH0_CLIENT_ID,
            "client_secret": settings.AUTH0_CLIENT_SECRET,
            "audience": f"https://{settings.AUTH0_DOMAIN}/api/v2/",
            "grant_type": "client_credentials"
        }
        headers = {"content-type": "application/json"}
        
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        
        return response.json()["access_token"]
    except Exception as e:
        print(f"=== DEBUG: Error obteniendo Management API token: {str(e)} ===")
        raise e

def update_user_app_metadata(user_id, app_metadata):
    """
    Actualiza el app_metadata de un usuario en Auth0
    """
    try:
        management_token = get_management_api_token()
        
        url = f"https://{settings.AUTH0_DOMAIN}/api/v2/users/{user_id}"
        headers = {
            "Authorization": f"Bearer {management_token}",
            "Content-Type": "application/json"
        }
        
        payload = {"app_metadata": app_metadata}
        
        response = requests.patch(url, json=payload, headers=headers)
        response.raise_for_status()
        
        print(f"=== DEBUG: App metadata actualizado para usuario {user_id} ===")
        return response.json()
    except Exception as e:
        print(f"=== DEBUG: Error actualizando app metadata: {str(e)} ===")
        raise e

def verify_jwt(token):
    try:
        print(f"=== DEBUG: Verificando JWT con dominio: {settings.AUTH0_DOMAIN} ===")
        print(f"=== DEBUG: Audience configurado: {settings.AUTH0_AUDIENCE} ===")
        
        jwks_url = f'https://{settings.AUTH0_DOMAIN}/.well-known/jwks.json'
        print(f"=== DEBUG: JWKS URL: {jwks_url} ===")
        
        jwks_response = requests.get(jwks_url)
        print(f"=== DEBUG: JWKS response status: {jwks_response.status_code} ===")
        
        if jwks_response.status_code != 200:
            print(f"=== DEBUG: Error obteniendo JWKS: {jwks_response.text} ===")
            raise Exception(f"Failed to fetch JWKS: {jwks_response.status_code}")
            
        jwks = jwks_response.json()
        unverified_header = jwt.get_unverified_header(token)
        print(f"=== DEBUG: Header no verificado: {unverified_header} ===")

        rsa_key = {}
        for key in jwks["keys"]:
            if key["kid"] == unverified_header["kid"]:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"]
                }
                print(f"=== DEBUG: RSA key encontrada para kid: {key['kid']} ===")
                break

        if not rsa_key:
            print(f"=== DEBUG: No se encontró RSA key para kid: {unverified_header.get('kid')} ===")
            print(f"=== DEBUG: Keys disponibles: {[k['kid'] for k in jwks['keys']]} ===")
            raise Exception("Public key not found.")

        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=ALGORITHMS,
            audience=settings.AUTH0_AUDIENCE,
            issuer=f"https://{settings.AUTH0_DOMAIN}/"
        )
        print(f"=== DEBUG: Token decodificado exitosamente ===")
        return payload
        
    except Exception as e:
        print(f"=== DEBUG: Error en verify_jwt: {str(e)} ===")
        import traceback
        print(f"=== DEBUG: Traceback: {traceback.format_exc()} ===")
        raise e
